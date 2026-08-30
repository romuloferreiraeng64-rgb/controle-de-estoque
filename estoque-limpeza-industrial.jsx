import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  LayoutDashboard, Package, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight,
  Undo2, HardHat, Wrench, ClipboardCheck, FileBarChart, ShieldCheck, Users,
  Search, LogOut, AlertTriangle, CheckCircle2, XCircle, Plus, X, Filter,
  Download, Building2, Truck, ClipboardList, History, Lock, ChevronRight,
  ChevronDown, Eye, EyeOff, Menu, TriangleAlert, PackageX, PackageCheck,
  BadgeAlert, CalendarClock, ScanLine
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

/* ============================== DESIGN TOKENS ============================== */
const C = {
  bg: "#EEF1F4",
  surface: "#FFFFFF",
  surfaceAlt: "#F5F7F9",
  ink: "#16212E",
  inkMuted: "#5B6774",
  inkFaint: "#8B96A3",
  border: "#DCE1E7",
  borderStrong: "#C3CAD2",
  primary: "#173654",
  primaryDeep: "#0F2740",
  steel: "#2D6E8E",
  steelLight: "#E7EFF3",
  amber: "#C9821A",
  amberBg: "#FBF0DD",
  amberBorder: "#EACB93",
  red: "#B23A32",
  redBg: "#FBEAE8",
  redBorder: "#E9BCB6",
  green: "#2E7D53",
  greenBg: "#E8F3EC",
  greenBorder: "#B9DCC6",
  slateBadge: "#EEF1F4",
};

const FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');";

/* ============================== DOMAIN CONSTANTS ============================== */
const CATEGORIES_SEED = {
  EPI: ["Capacete", "Óculos", "Protetor auricular", "Respirador", "Máscara", "Luvas", "Botina",
    "Perneira", "Protetor facial", "Cinto de segurança", "Talabarte", "Uniforme", "Capa de chuva"],
  Ferramentas: ["Pá", "Enxada", "Picareta", "Marreta", "Martelo", "Chave", "Alicate",
    "Carrinho de mão", "Rodo", "Vassoura", "Escova", "Mangueira", "Esguicho", "Conexões", "Ferramentas manuais"],
  "Materiais Operacionais": ["Mangueiras", "Abraçadeiras", "Conexões", "Bicos", "Adaptadores",
    "Materiais de limpeza", "Produtos químicos", "Peças de reposição"],
};
const UNIDADES = ["UN", "PAR", "CX", "KG", "L", "M", "RL", "CJ"];
const LOCATIONS_SEED = ["Almoxarifado Central", "Mina", "Usina", "Oficina", "Apoio Operacional"];
const AREAS_SEED = ["Mina", "Usina", "Oficina", "Administrativo", "Almoxarifado"];
const TURNOS = ["Turno A", "Turno B", "Turno C", "Turno D"];
const SITUACOES = ["Ativo", "Bloqueado", "Obsoleto", "Em análise"];
const TOOL_STATUS = ["Disponível", "Emprestada", "Em uso", "Danificada", "Em manutenção", "Extraviada", "Baixada"];
const RETURN_COND = ["Boa", "Danificada", "Necessita manutenção", "Sucata"];

const ROLE_LABEL = { admin: "Administrador", gestor: "Gestor", almoxarife: "Almoxarife / Estoquista", consulta: "Consulta" };

const PERMS = {
  admin: { all: true },
  gestor: { view: true, entradaSaida: true, aprovarAjuste: true, relatorios: true },
  almoxarife: { view: true, entradaSaida: true, devolucao: true, danificado: true, perda: true, transferencia: true, emprestimo: true, inventario: true },
  consulta: { view: true },
};
function can(user, action) {
  if (!user) return false;
  const p = PERMS[user.perfil] || {};
  if (p.all) return true;
  return !!p[action];
}

/* ============================== HELPERS ============================== */
let _seq = 1000;
const uid = (p = "ID") => `${p}-${(_seq++).toString(36).toUpperCase()}`;
const todayISO = () => new Date().toISOString().slice(0, 10);
const nowStamp = () => new Date().toISOString();
const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
  return d.toLocaleDateString("pt-BR");
};
const fmtDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};
const fmtMoney = (v) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

function classifyStock(m) {
  const atual = Number(m.estoque_atual) || 0;
  const min = Number(m.estoque_minimo) || 0;
  if (atual <= min) return "critico";
  if (atual <= min * 1.2) return "atencao";
  return "normal";
}
const STOCK_LABEL = { critico: "CRÍTICO", atencao: "ATENÇÃO", normal: "NORMAL" };
const STOCK_COLOR = {
  critico: { fg: C.red, bg: C.redBg, bd: C.redBorder },
  atencao: { fg: C.amber, bg: C.amberBg, bd: C.amberBorder },
  normal: { fg: C.green, bg: C.greenBg, bd: C.greenBorder },
};

function isEpi(material) {
  return material?.categoria === "EPI";
}
function isFerramenta(material) {
  return material?.categoria === "Ferramentas" || material?.tipo_item === "ferramenta";
}

function downloadCSV(filename, rows) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(";"), ...rows.map((r) => headers.map((h) => esc(r[h])).join(";"))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ============================== SEED DATA ============================== */
function buildSeed() {
  const mat = (o) => ({
    id: uid("MAT"),
    codigo_sap: "",
    subcategoria: "",
    fabricante: "",
    modelo: "",
    tamanho: "",
    ca: "",
    validade_ca: "",
    localizacao: "Almoxarifado Central",
    estoque_maximo: 0,
    ponto_reposicao: 0,
    valor_unitario: 0,
    foto: "",
    situacao: "Ativo",
    tipo_item: "consumivel",
    status_ferramenta: "Disponível",
    created_at: nowStamp(),
    updated_at: nowStamp(),
    created_by: "seed",
    ...o,
  });

  const materials = [
    mat({ codigo_interno: "EPI-001", nome: "Luva nitrílica", categoria: "EPI", subcategoria: "Luvas", unidade: "PAR", ca: "12345", validade_ca: "2027-03-01", estoque_atual: 310, estoque_minimo: 200, estoque_maximo: 800, valor_unitario: 6.9 }),
    mat({ codigo_interno: "EPI-002", nome: "Capacete de segurança classe B", categoria: "EPI", subcategoria: "Capacete", unidade: "UN", ca: "31469", validade_ca: "2026-09-15", estoque_atual: 42, estoque_minimo: 30, estoque_maximo: 100, valor_unitario: 38.5 }),
    mat({ codigo_interno: "EPI-003", nome: "Protetor auricular tipo plug", categoria: "EPI", subcategoria: "Protetor auricular", unidade: "PAR", ca: "5674", validade_ca: "2027-01-10", estoque_atual: 620, estoque_minimo: 400, estoque_maximo: 1500, valor_unitario: 1.2 }),
    mat({ codigo_interno: "EPI-004", nome: "Respirador semifacial PFF2", categoria: "EPI", subcategoria: "Respirador", unidade: "UN", ca: "38921", validade_ca: "2026-10-05", estoque_atual: 18, estoque_minimo: 25, estoque_maximo: 150, valor_unitario: 9.4 }),
    mat({ codigo_interno: "EPI-005", nome: "Botina de segurança com bico PVC", categoria: "EPI", subcategoria: "Botina", unidade: "PAR", ca: "40211", validade_ca: "2027-06-20", estoque_atual: 65, estoque_minimo: 40, estoque_maximo: 150, valor_unitario: 79.9, tamanho: "Diversos" }),
    mat({ codigo_interno: "FER-001", nome: "Mangueira de alta pressão 2 1/2\"", categoria: "Ferramentas", subcategoria: "Mangueira", unidade: "M", estoque_atual: 143, estoque_minimo: 100, estoque_maximo: 400, valor_unitario: 24.0, tipo_item: "consumivel" }),
    mat({ codigo_interno: "FER-002", nome: "Lavadora de alta pressão industrial", categoria: "Ferramentas", subcategoria: "Ferramentas manuais", unidade: "UN", estoque_atual: 6, estoque_minimo: 2, estoque_maximo: 10, valor_unitario: 3200, tipo_item: "ferramenta", status_ferramenta: "Disponível" }),
    mat({ codigo_interno: "FER-003", nome: "Marreta 5kg", categoria: "Ferramentas", subcategoria: "Marreta", unidade: "UN", estoque_atual: 9, estoque_minimo: 4, estoque_maximo: 15, valor_unitario: 65, tipo_item: "ferramenta", status_ferramenta: "Disponível" }),
    mat({ codigo_interno: "MOP-001", nome: "Detergente alcalino clorado", categoria: "Materiais Operacionais", subcategoria: "Produtos químicos", unidade: "L", estoque_atual: 210, estoque_minimo: 150, estoque_maximo: 600, valor_unitario: 11.3 }),
    mat({ codigo_interno: "MOP-002", nome: "Abraçadeira inox 3\"", categoria: "Materiais Operacionais", subcategoria: "Abraçadeiras", unidade: "UN", estoque_atual: 340, estoque_minimo: 200, estoque_maximo: 1000, valor_unitario: 3.1 }),
  ];

  const employees = [
    { id: uid("FUNC"), nome: "José Silva", matricula: "123456", funcao: "Auxiliar de Serviços Gerais", area: "Mina", turno: "Turno A" },
    { id: uid("FUNC"), nome: "Carlos Mendes", matricula: "123789", funcao: "Técnico de Limpeza Industrial", area: "Usina", turno: "Turno B" },
    { id: uid("FUNC"), nome: "Maria Souza", matricula: "124001", funcao: "Supervisora Operacional", area: "Usina", turno: "Turno A" },
    { id: uid("FUNC"), nome: "João Pereira", matricula: "124055", funcao: "Auxiliar de Serviços Gerais", area: "Oficina", turno: "Turno C" },
  ];

  const costCenters = [
    { id: uid("CC"), codigo: "CC-MINA-01", nome: "Operação Mina" },
    { id: uid("CC"), codigo: "CC-USINA-01", nome: "Operação Usina" },
    { id: uid("CC"), codigo: "CC-OFICINA-01", nome: "Manutenção / Oficina" },
    { id: uid("CC"), codigo: "CC-ADM-01", nome: "Administrativo" },
  ];

  const suppliers = [
    { id: uid("FORN"), nome: "Proteção Total EPIs Ltda", cnpj: "12.345.678/0001-90", contato: "(94) 3321-1000" },
    { id: uid("FORN"), nome: "Industrial Clean Distribuidora", cnpj: "98.765.432/0001-11", contato: "(94) 3321-2200" },
    { id: uid("FORN"), nome: "FerraMax Equipamentos", cnpj: "45.678.912/0001-33", contato: "(94) 3321-3300" },
  ];

  const users = [
    { id: uid("USR"), nome: "Romulo Ferreira", email: "admin@limpezaindustrial.com", senha: "admin123", perfil: "admin", bloqueado: false },
    { id: uid("USR"), nome: "Bruno Castro", email: "gestor@limpezaindustrial.com", senha: "gestor123", perfil: "gestor", bloqueado: false },
    { id: uid("USR"), nome: "João Silva", email: "almoxarife@limpezaindustrial.com", senha: "almox123", perfil: "almoxarife", bloqueado: false },
    { id: uid("USR"), nome: "Fernanda Lima", email: "consulta@limpezaindustrial.com", senha: "consulta123", perfil: "consulta", bloqueado: false },
  ];

  const now = new Date();
  const iso = (d) => d.toISOString();
  const mv = (o) => ({ id: uid("MOV"), timestamp: nowStamp(), status: "Concluída", ...o });
  const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };

  const luva = materials[0];
  const movements = [
    mv({ tipo: "entrada", material_id: luva.id, material_nome: luva.nome, quantidade_anterior: 270, quantidade: 80, quantidade_final: 350, usuario: "João Silva", fornecedor: "Proteção Total EPIs Ltda", nf: "45210", pedido: "PC-9910", valor_unitario: 6.9, lote: "L2026-08", validade: "2028-01-01", responsavel_recebimento: "João Silva", local_armazenamento: "Almoxarifado Central", observacao: "Reposição mensal", timestamp: daysAgo(20) }),
    mv({ tipo: "saida", material_id: luva.id, material_nome: luva.nome, quantidade_anterior: 350, quantidade: 40, quantidade_final: 310, usuario: "João Silva", area_destino: "Usina", centro_custo: "CC-USINA-01", colaborador: "Carlos Mendes", matricula: "123789", empresa: "Própria", supervisor: "Maria Souza", turno: "Turno B", motivo: "Entrega programada de EPI", responsavel_entrega: "João Silva", ca: "12345", data_entrega: daysAgo(9), timestamp: daysAgo(9) }),
    mv({ tipo: "saida", material_id: materials[7].id, material_nome: materials[7].nome, quantidade_anterior: 12, quantidade: 3, quantidade_final: 9, usuario: "João Silva", area_destino: "Oficina", centro_custo: "CC-OFICINA-01", colaborador: "João Pereira", matricula: "124055", empresa: "Própria", supervisor: "Maria Souza", turno: "Turno C", motivo: "Uso operacional", responsavel_entrega: "João Silva", timestamp: daysAgo(15) }),
    mv({ tipo: "danificado", material_id: materials[5].id, material_nome: materials[5].nome, quantidade_anterior: 150, quantidade: 7, quantidade_final: 143, usuario: "João Silva", area: "Usina", motivo: "Ruptura por abrasão", descricao_dano: "Mangueira rompida próxima ao engate", supervisor: "Maria Souza", destino: "Descarte", timestamp: daysAgo(6) }),
  ];

  return {
    materials, employees, costCenters, suppliers, users, movements,
    categories: CATEGORIES_SEED, areas: AREAS_SEED, locations: LOCATIONS_SEED,
    toolLoans: [], inventoryCounts: [], auditLog: [
      { id: uid("LOG"), timestamp: daysAgo(30), usuario: "Sistema", tela: "Sistema", acao: "Base inicial carregada (dados de demonstração).", de: "", para: "" },
    ],
  };
}

/* ============================== UI ATOMS ============================== */
function GlobalStyle() {
  return (
    <style>{`
      ${FONT_IMPORT}
      .app-root { font-family: 'Inter', system-ui, sans-serif; color: ${C.ink}; }
      .app-root h1, .app-root h2, .app-root h3, .app-root .display {
        font-family: 'Barlow Condensed', 'Inter', sans-serif; letter-spacing: 0.01em;
      }
      .app-root .mono { font-family: 'JetBrains Mono', monospace; }
      .app-root input, .app-root select, .app-root textarea {
        font-family: 'Inter', sans-serif; outline: none;
      }
      .app-root input:focus, .app-root select:focus, .app-root textarea:focus, .app-root button:focus-visible {
        box-shadow: 0 0 0 3px ${C.steel}33; border-color: ${C.steel} !important;
      }
      .app-root ::-webkit-scrollbar { width: 8px; height: 8px; }
      .app-root ::-webkit-scrollbar-thumb { background: ${C.borderStrong}; border-radius: 4px; }
      .app-root table { border-collapse: collapse; width: 100%; }
      .app-root tbody tr:hover { background: ${C.surfaceAlt}; }
      .binlabel { position: relative; }
      .binlabel::before {
        content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px;
      }
      @media (prefers-reduced-motion: reduce) { .app-root * { transition: none !important; animation: none !important; } }
    `}</style>
  );
}

function Btn({ children, onClick, variant = "primary", size = "md", icon: Icon, type = "button", disabled, full }) {
  const sizes = { sm: "6px 10px", md: "9px 14px", lg: "11px 18px" };
  const fs = { sm: 12.5, md: 13.5, lg: 14.5 };
  const styles = {
    primary: { background: C.primary, color: "#fff", border: `1px solid ${C.primary}` },
    steel: { background: C.steel, color: "#fff", border: `1px solid ${C.steel}` },
    ghost: { background: "transparent", color: C.primary, border: `1px solid ${C.border}` },
    danger: { background: C.red, color: "#fff", border: `1px solid ${C.red}` },
    subtle: { background: C.surfaceAlt, color: C.ink, border: `1px solid ${C.border}` },
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{
        ...styles[variant], padding: sizes[size], fontSize: fs[size], fontWeight: 600,
        borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 6, cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1, width: full ? "100%" : "auto", justifyContent: full ? "center" : "flex-start",
        whiteSpace: "nowrap",
      }}
    >
      {Icon ? <Icon size={size === "sm" ? 14 : 16} /> : null}
      {children}
    </button>
  );
}

function Badge({ children, tone = "slate" }) {
  const tones = {
    slate: { bg: C.slateBadge, fg: C.inkMuted, bd: C.border },
    green: { bg: C.greenBg, fg: C.green, bd: C.greenBorder },
    amber: { bg: C.amberBg, fg: C.amber, bd: C.amberBorder },
    red: { bg: C.redBg, fg: C.red, bd: C.redBorder },
    steel: { bg: C.steelLight, fg: C.steel, bd: "#BFDAE6" },
  };
  const t = tones[tone] || tones.slate;
  return (
    <span style={{
      background: t.bg, color: t.fg, border: `1px solid ${t.bd}`, borderRadius: 999,
      padding: "2px 9px", fontSize: 11.5, fontWeight: 700, letterSpacing: "0.03em",
      textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

function Card({ children, style, pad = 16 }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: pad, ...style }}>
      {children}
    </div>
  );
}

function StatCard({ label, value, sub, tone = "default", icon: Icon }) {
  const toneColor = tone === "red" ? C.red : tone === "amber" ? C.amber : tone === "green" ? C.green : C.primary;
  return (
    <Card pad={14}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
        {Icon ? <Icon size={16} color={toneColor} /> : null}
      </div>
      <div className="display" style={{ fontSize: 30, fontWeight: 800, color: C.ink, lineHeight: 1.1, marginTop: 4 }}>{value}</div>
      {sub ? <div style={{ fontSize: 12, color: C.inkMuted, marginTop: 3 }}>{sub}</div> : null}
    </Card>
  );
}

function Field({ label, children, required, hint, span }) {
  return (
    <div style={{ gridColumn: span ? `span ${span}` : undefined, marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.inkMuted, marginBottom: 4 }}>
        {label} {required ? <span style={{ color: C.red }}>*</span> : null}
      </label>
      {children}
      {hint ? <div style={{ fontSize: 11, color: C.inkFaint, marginTop: 3 }}>{hint}</div> : null}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 6,
  fontSize: 13.5, background: "#fff", color: C.ink, boxSizing: "border-box",
};
function TIn(props) { return <input {...props} style={{ ...inputStyle, ...(props.style || {}) }} />; }
function TSel({ children, ...props }) { return <select {...props} style={{ ...inputStyle, ...(props.style || {}) }}>{children}</select>; }
function TArea(props) { return <textarea rows={2} {...props} style={{ ...inputStyle, resize: "vertical", ...(props.style || {}) }} />; }

function Modal({ title, onClose, children, width = 640 }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,23,32,0.55)", display: "flex",
      alignItems: "flex-start", justifyContent: "center", zIndex: 100, padding: "5vh 16px", overflowY: "auto",
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: C.surface, borderRadius: 12, width: "100%", maxWidth: width,
        boxShadow: "0 20px 60px rgba(15,23,32,0.35)", overflow: "hidden",
      }}>
        <div style={{
          padding: "14px 18px", borderBottom: `1px solid ${C.border}`, display: "flex",
          alignItems: "center", justifyContent: "space-between", background: C.primary,
        }}>
          <h3 style={{ margin: 0, color: "#fff", fontWeight: 700, fontSize: 19 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#fff" }}><X size={20} /></button>
        </div>
        <div style={{ padding: 18, maxHeight: "75vh", overflowY: "auto" }}>{children}</div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon = PackageX, title, sub }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px", color: C.inkFaint }}>
      <Icon size={30} style={{ marginBottom: 8, opacity: 0.6 }} />
      <div style={{ fontWeight: 700, color: C.inkMuted, fontSize: 14 }}>{title}</div>
      {sub ? <div style={{ fontSize: 12.5, marginTop: 4 }}>{sub}</div> : null}
    </div>
  );
}

function SectionHeader({ title, sub, right }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
      <div>
        <h2 className="display" style={{ margin: 0, fontSize: 26, fontWeight: 800, color: C.ink }}>{title}</h2>
        {sub ? <div style={{ fontSize: 13, color: C.inkMuted, marginTop: 2 }}>{sub}</div> : null}
      </div>
      {right ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{right}</div> : null}
    </div>
  );
}

function Th({ children, w }) {
  return <th style={{ textAlign: "left", padding: "9px 12px", fontSize: 11, fontWeight: 700, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: `2px solid ${C.border}`, width: w, whiteSpace: "nowrap" }}>{children}</th>;
}
function Td({ children, mono, style }) {
  return <td className={mono ? "mono" : ""} style={{ padding: "10px 12px", fontSize: 13, borderBottom: `1px solid ${C.border}`, color: C.ink, ...style }}>{children}</td>;
}

/* ============================== LOGIN ============================== */
function LoginPage({ users, onLogin }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [remember, setRemember] = useState(true);

  function submit(e) {
    e.preventDefault();
    const u = users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!u) { setErr("Usuário ou senha inválidos."); return; }
    if (u.bloqueado) { setErr("Este usuário está bloqueado. Procure o administrador."); return; }
    if (u.senha !== senha) { setErr("Usuário ou senha inválidos."); return; }
    setErr("");
    onLogin(u);
  }

  const demo = [
    ["Administrador", "admin@limpezaindustrial.com", "admin123"],
    ["Gestor", "gestor@limpezaindustrial.com", "gestor123"],
    ["Almoxarife", "almoxarife@limpezaindustrial.com", "almox123"],
    ["Consulta", "consulta@limpezaindustrial.com", "consulta123"],
  ];

  return (
    <div className="app-root" style={{ minHeight: "100vh", background: C.primaryDeep, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <GlobalStyle />
      <div style={{ width: "100%", maxWidth: 920, display: "grid", gridTemplateColumns: "1.1fr 1fr", borderRadius: 14, overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,0.4)" }} className="login-grid">
        <div style={{ background: `linear-gradient(160deg, ${C.primaryDeep}, ${C.primary} 60%, ${C.steel})`, padding: 40, color: "#fff", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid rgba(255,255,255,0.3)", borderRadius: 999, padding: "5px 12px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              <ShieldCheck size={14} /> Controle patrimonial
            </div>
            <h1 className="display" style={{ fontSize: 44, fontWeight: 800, margin: "22px 0 8px", lineHeight: 1 }}>ESTOQUE<br />LIMPEZA<br />INDUSTRIAL</h1>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 14.5, maxWidth: 340, lineHeight: 1.5 }}>
              Rastreabilidade completa de EPIs, ferramentas e materiais operacionais — do recebimento até a baixa.
            </p>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 16, fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
            Toda movimentação gera registro de auditoria permanente e não editável.
          </div>
        </div>
        <div style={{ background: "#fff", padding: 40, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <h2 className="display" style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800, color: C.ink }}>Acessar o sistema</h2>
          <p style={{ margin: "0 0 20px", fontSize: 13, color: C.inkMuted }}>Informe suas credenciais corporativas.</p>
          <form onSubmit={submit}>
            <Field label="E-mail ou usuário" required>
              <TIn type="text" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@empresa.com" autoFocus />
            </Field>
            <Field label="Senha" required>
              <div style={{ position: "relative" }}>
                <TIn type={showPw ? "text" : "password"} value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="••••••••" style={{ paddingRight: 36 }} />
                <button type="button" onClick={() => setShowPw((v) => !v)} style={{ position: "absolute", right: 8, top: 8, background: "none", border: "none", cursor: "pointer", color: C.inkFaint }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <label style={{ fontSize: 12.5, color: C.inkMuted, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Manter conectado
              </label>
              <a href="#" onClick={(e) => { e.preventDefault(); setErr("Um link de recuperação seria enviado ao e-mail cadastrado (demonstração)."); }} style={{ fontSize: 12.5, color: C.steel, fontWeight: 600, textDecoration: "none" }}>Esqueci minha senha</a>
            </div>
            {err ? <div style={{ background: C.redBg, border: `1px solid ${C.redBorder}`, color: C.red, borderRadius: 6, padding: "8px 10px", fontSize: 12.5, marginBottom: 14 }}>{err}</div> : null}
            <Btn type="submit" full icon={ScanLine}>Entrar</Btn>
          </form>
          <div style={{ marginTop: 22, background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.inkFaint, textTransform: "uppercase", marginBottom: 6 }}>Usuários de demonstração</div>
            {demo.map((d) => (
              <div key={d[1]} style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: C.inkMuted, padding: "2px 0", cursor: "pointer" }}
                onClick={() => { setEmail(d[1]); setSenha(d[2]); }}>
                <span><b style={{ color: C.ink }}>{d[0]}</b></span>
                <span className="mono">{d[1]} / {d[2]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`@media (max-width: 800px) { .login-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

/* ============================== MENU CONFIG ============================== */
const MENU = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, perm: "view" },
  { group: "Estoque", icon: Package, perm: "view", items: [
    { key: "stock:consulta", label: "Consulta de estoque", perm: "view" },
    { key: "stock:entrada", label: "Entrada", perm: "entradaSaida" },
    { key: "stock:saida", label: "Saída", perm: "entradaSaida" },
    { key: "stock:transferencia", label: "Transferência", perm: "transferencia" },
    { key: "stock:devolucao", label: "Devolução", perm: "devolucao" },
    { key: "stock:danificado", label: "Material danificado", perm: "danificado" },
    { key: "stock:perda", label: "Perda / Extravio", perm: "perda" },
  ]},
  { group: "EPI", icon: HardHat, perm: "view", items: [
    { key: "epi:entrega", label: "Entrega", perm: "entradaSaida" },
    { key: "epi:historico", label: "Histórico por colaborador", perm: "view" },
    { key: "epi:validade", label: "Validade de CA", perm: "view" },
  ]},
  { group: "Ferramentas", icon: Wrench, perm: "view", items: [
    { key: "tools:lista", label: "Disponíveis", perm: "view" },
    { key: "tools:emprestimos", label: "Empréstimos", perm: "emprestimo" },
    { key: "tools:devolucoes", label: "Devoluções", perm: "emprestimo" },
  ]},
  { group: "Inventário", icon: ClipboardCheck, perm: "inventario", items: [
    { key: "inv:contagem", label: "Nova contagem", perm: "inventario" },
    { key: "inv:divergencias", label: "Divergências", perm: "view" },
  ]},
  { key: "historico", label: "Histórico de movimentações", icon: History, perm: "view" },
  { key: "relatorios", label: "Relatórios", icon: FileBarChart, perm: "relatorios" },
  { group: "Cadastros", icon: ClipboardList, perm: "all", items: [
    { key: "cad:materiais", label: "Materiais", perm: "all" },
    { key: "cad:colaboradores", label: "Colaboradores", perm: "all" },
    { key: "cad:areas", label: "Áreas / Centros de custo", perm: "all" },
    { key: "cad:fornecedores", label: "Fornecedores", perm: "all" },
  ]},
  { group: "Administração", icon: Lock, perm: "all", items: [
    { key: "admin:usuarios", label: "Usuários e perfis", perm: "all" },
    { key: "admin:logs", label: "Logs de auditoria", perm: "all" },
  ]},
];

function hasAccess(user, perm) {
  if (perm === "view") return can(user, "view") || (PERMS[user.perfil] || {}).all;
  if (perm === "relatorios") return can(user, "relatorios") || can(user, "view");
  return can(user, perm);
}

function Sidebar({ user, page, setPage, mobileOpen, setMobileOpen }) {
  const [openGroups, setOpenGroups] = useState(() => new Set(["Estoque"]));
  function toggleGroup(g) {
    setOpenGroups((prev) => { const n = new Set(prev); n.has(g) ? n.delete(g) : n.add(g); return n; });
  }
  return (
    <div style={{
      width: 244, background: C.primaryDeep, color: "#fff", flexShrink: 0, height: "100vh",
      position: "sticky", top: 0, overflowY: "auto", display: "flex", flexDirection: "column",
      transform: mobileOpen ? "translateX(0)" : undefined,
    }} className="sidebar">
      <div style={{ padding: "18px 16px", borderBottom: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: C.steel, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ShieldCheck size={18} color="#fff" />
        </div>
        <div>
          <div className="display" style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.05 }}>ESTOQUE LI</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", letterSpacing: "0.05em" }}>LIMPEZA INDUSTRIAL</div>
        </div>
      </div>
      <nav style={{ padding: "10px 8px", flex: 1 }}>
        {MENU.filter((m) => hasAccess(user, m.perm)).map((m, i) => {
          if (!m.group) {
            const Icon = m.icon;
            const active = page === m.key;
            return (
              <button key={m.key} onClick={() => { setPage(m.key); setMobileOpen(false); }} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", marginBottom: 2,
                background: active ? C.steel : "transparent", border: "none", borderRadius: 7, color: "#fff",
                fontSize: 13.5, fontWeight: 600, cursor: "pointer", textAlign: "left",
              }}>
                <Icon size={16} /> {m.label}
              </button>
            );
          }
          const items = m.items.filter((it) => hasAccess(user, it.perm));
          if (!items.length) return null;
          const Icon = m.icon;
          const open = openGroups.has(m.group);
          const groupActive = items.some((it) => it.key === page);
          return (
            <div key={m.group} style={{ marginBottom: 2 }}>
              <button onClick={() => toggleGroup(m.group)} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 10px",
                background: groupActive && !open ? "rgba(255,255,255,0.08)" : "transparent", border: "none", borderRadius: 7,
                color: "#fff", fontSize: 13.5, fontWeight: 700, cursor: "pointer", textAlign: "left",
              }}>
                <Icon size={16} /> <span style={{ flex: 1 }}>{m.group}</span>
                {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {open && (
                <div style={{ marginLeft: 14, borderLeft: "1px solid rgba(255,255,255,0.14)", paddingLeft: 8, marginTop: 2, marginBottom: 4 }}>
                  {items.map((it) => {
                    const active = page === it.key;
                    return (
                      <button key={it.key} onClick={() => { setPage(it.key); setMobileOpen(false); }} style={{
                        width: "100%", textAlign: "left", padding: "7px 10px", marginBottom: 1,
                        background: active ? C.steel : "transparent", border: "none", borderRadius: 6,
                        color: active ? "#fff" : "rgba(255,255,255,0.78)", fontSize: 12.8, fontWeight: active ? 700 : 500, cursor: "pointer",
                      }}>{it.label}</button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,0.12)", fontSize: 10.5, color: "rgba(255,255,255,0.45)" }}>
        Dados armazenados em nuvem compartilhada · protótipo
      </div>
    </div>
  );
}

function TopBar({ user, onLogout, setMobileOpen }) {
  return (
    <div style={{
      height: 58, background: C.surface, borderBottom: `1px solid ${C.border}`, display: "flex",
      alignItems: "center", justifyContent: "space-between", padding: "0 20px", position: "sticky", top: 0, zIndex: 20,
    }}>
      <button className="menu-btn" onClick={() => setMobileOpen(true)} style={{ display: "none", background: "none", border: "none", cursor: "pointer" }}>
        <Menu size={22} color={C.ink} />
      </button>
      <div style={{ fontSize: 12.5, color: C.inkFaint }} />
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{user.nome}</div>
          <div style={{ fontSize: 11, color: C.inkFaint }}>{ROLE_LABEL[user.perfil]}</div>
        </div>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: C.steelLight, color: C.steel, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13 }}>
          {user.nome.split(" ").map((s) => s[0]).slice(0, 2).join("")}
        </div>
        <button onClick={onLogout} title="Sair" style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 7, padding: 8, cursor: "pointer", color: C.inkMuted }}>
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );
}

/* ============================== DASHBOARD ============================== */
function Dashboard({ data }) {
  const { materials, movements, toolLoans } = data;
  const thisMonth = new Date().toISOString().slice(0, 7);
  const inMonth = (m) => (m.timestamp || "").slice(0, 7) === thisMonth;

  const totalItens = materials.length;
  const qtdDisponivel = materials.reduce((s, m) => s + (Number(m.estoque_atual) || 0), 0);
  const valorTotal = materials.reduce((s, m) => s + (Number(m.estoque_atual) || 0) * (Number(m.valor_unitario) || 0), 0);
  const abaixoMin = materials.filter((m) => classifyStock(m) !== "normal").length;
  const epiMats = materials.filter(isEpi);
  const toolMats = materials.filter((m) => m.tipo_item === "ferramenta");

  const entradasMes = movements.filter((m) => m.tipo === "entrada" && inMonth(m));
  const saidasMes = movements.filter((m) => m.tipo === "saida" && inMonth(m));
  const devolucoesMes = movements.filter((m) => m.tipo === "devolucao" && inMonth(m));
  const transfMes = movements.filter((m) => m.tipo === "transferencia" && inMonth(m));
  const danificadosMes = movements.filter((m) => m.tipo === "danificado" && inMonth(m));
  const perdasMes = movements.filter((m) => m.tipo === "perda" && inMonth(m));

  const epiSaidasMes = saidasMes.filter((m) => epiMats.some((e) => e.id === m.material_id));
  const custoEpiMes = epiSaidasMes.reduce((s, m) => {
    const mat = materials.find((x) => x.id === m.material_id);
    return s + (Number(m.quantidade) || 0) * (Number(mat?.valor_unitario) || 0);
  }, 0);

  const emprestadas = toolMats.filter((m) => m.status_ferramenta === "Emprestada").length;
  const naoDevolvidas = toolLoans.filter((l) => !l.data_devolucao && l.previsao_devolucao && l.previsao_devolucao < todayISO()).length;

  // consumo mensal últimos 6 meses (saídas)
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    months.push({ key: d.toISOString().slice(0, 7), label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "") });
  }
  const consumoMensal = months.map((mo) => ({
    mes: mo.label.charAt(0).toUpperCase() + mo.label.slice(1),
    saidas: movements.filter((m) => m.tipo === "saida" && (m.timestamp || "").slice(0, 7) === mo.key).reduce((s, m) => s + (Number(m.quantidade) || 0), 0),
  }));

  const consumoPorMaterial = {};
  movements.filter((m) => m.tipo === "saida").forEach((m) => {
    consumoPorMaterial[m.material_nome] = (consumoPorMaterial[m.material_nome] || 0) + (Number(m.quantidade) || 0);
  });
  const topMateriais = Object.entries(consumoPorMaterial).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([nome, qtd]) => ({ nome: nome?.length > 18 ? nome.slice(0, 16) + "…" : nome, qtd }));

  const criticos = materials.filter((m) => classifyStock(m) === "critico").slice(0, 6);

  return (
    <div>
      <SectionHeader title="Painel executivo" sub="Visão geral do estoque, movimentações, EPI e ferramentas" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        <StatCard label="Estoque total" value={qtdDisponivel.toLocaleString("pt-BR")} sub={`${totalItens} itens cadastrados`} icon={Package} />
        <StatCard label="Valor em estoque" value={fmtMoney(valorTotal)} icon={FileBarChart} />
        <StatCard label="Itens críticos" value={abaixoMin} sub="Abaixo ou próximo do mínimo" tone={abaixoMin ? "red" : "green"} icon={AlertTriangle} />
        <StatCard label="EPIs cadastrados" value={epiMats.length} icon={HardHat} />
        <StatCard label="Ferramentas emprestadas" value={emprestadas} icon={Wrench} />
        <StatCard label="Não devolvidas (atraso)" value={naoDevolvidas} tone={naoDevolvidas ? "red" : "green"} icon={TriangleAlert} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
        <StatCard label="Entradas do mês" value={entradasMes.length} tone="green" icon={ArrowDownCircle} />
        <StatCard label="Saídas do mês" value={saidasMes.length} icon={ArrowUpCircle} />
        <StatCard label="Devoluções" value={devolucoesMes.length} icon={Undo2} />
        <StatCard label="Transferências" value={transfMes.length} icon={ArrowLeftRight} />
        <StatCard label="Avarias" value={danificadosMes.length} tone={danificadosMes.length ? "amber" : "green"} icon={PackageX} />
        <StatCard label="Perdas / extravios" value={perdasMes.length} tone={perdasMes.length ? "red" : "green"} icon={BadgeAlert} />
        <StatCard label="Custo EPI no mês" value={fmtMoney(custoEpiMes)} icon={HardHat} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 14, marginBottom: 16 }} className="dash-charts">
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: C.ink }}>Consumo mensal (unidades saídas)</div>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={consumoMensal} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: C.inkMuted }} axisLine={{ stroke: C.border }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: C.inkMuted }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: `1px solid ${C.border}` }} />
                <Bar dataKey="saidas" fill={C.steel} radius={[4, 4, 0, 0]} name="Saídas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: C.ink }}>Materiais mais utilizados</div>
          {topMateriais.length ? (
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={topMateriais} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: C.inkMuted }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="nome" tick={{ fontSize: 11, fill: C.inkMuted }} width={100} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: `1px solid ${C.border}` }} />
                  <Bar dataKey="qtd" fill={C.amber} radius={[0, 4, 4, 0]} name="Saídas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyState title="Sem movimentações de saída ainda" />}
        </Card>
      </div>

      <Card>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: C.ink, display: "flex", alignItems: "center", gap: 6 }}>
          <TriangleAlert size={16} color={C.red} /> Itens abaixo do estoque mínimo
        </div>
        {criticos.length ? (
          <table><thead><tr><Th>Material</Th><Th>Categoria</Th><Th>Saldo</Th><Th>Mínimo</Th><Th>Situação</Th></tr></thead>
            <tbody>{criticos.map((m) => (
              <tr key={m.id}><Td>{m.nome}</Td><Td>{m.categoria}</Td><Td mono>{m.estoque_atual}</Td><Td mono>{m.estoque_minimo}</Td>
                <Td><Badge tone={classifyStock(m) === "critico" ? "red" : "amber"}>{STOCK_LABEL[classifyStock(m)]}</Badge></Td></tr>
            ))}</tbody></table>
        ) : <EmptyState icon={CheckCircle2} title="Nenhum item crítico no momento" />}
      </Card>
      <style>{`@media (max-width: 900px) { .dash-charts { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

/* ============================== ESTOQUE: CONSULTA ============================== */
function StockConsulta({ materials }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Todas");
  const [status, setStatus] = useState("Todos");
  const cats = ["Todas", ...Array.from(new Set(materials.map((m) => m.categoria)))];

  const filtered = materials.filter((m) => {
    if (cat !== "Todas" && m.categoria !== cat) return false;
    if (status !== "Todos" && classifyStock(m) !== status) return false;
    if (q && !(`${m.nome} ${m.codigo_interno} ${m.codigo_sap} ${m.ca}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  return (
    <div>
      <SectionHeader title="Consulta de estoque" sub={`${filtered.length} de ${materials.length} materiais`}
        right={<Btn variant="ghost" size="sm" icon={Download} onClick={() => downloadCSV("estoque_atual.csv", filtered.map((m) => ({
          Codigo: m.codigo_interno, Material: m.nome, Categoria: m.categoria, Unidade: m.unidade, Saldo: m.estoque_atual,
          Minimo: m.estoque_minimo, Maximo: m.estoque_maximo, ValorUnitario: m.valor_unitario, Situacao: STOCK_LABEL[classifyStock(m)],
        })))}>Exportar CSV</Btn>} />
      <Card pad={12} style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: "1 1 220px" }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: 10, color: C.inkFaint }} />
            <TIn placeholder="Buscar por nome, código ou CA..." value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 30 }} />
          </div>
          <TSel value={cat} onChange={(e) => setCat(e.target.value)} style={{ width: 200 }}>
            {cats.map((c) => <option key={c}>{c}</option>)}
          </TSel>
          <TSel value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: 170 }}>
            <option value="Todos">Todas situações</option>
            <option value="normal">🟢 Normal</option>
            <option value="atencao">🟡 Atenção</option>
            <option value="critico">🔴 Crítico</option>
          </TSel>
        </div>
      </Card>
      <Card pad={0}>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead><tr><Th>Código</Th><Th>Material</Th><Th>Categoria</Th><Th>Local</Th><Th>Saldo</Th><Th>Mín / Máx</Th><Th>Valor un.</Th><Th>Situação</Th></tr></thead>
            <tbody>
              {filtered.map((m) => {
                const st = classifyStock(m);
                const tone = st === "critico" ? "red" : st === "atencao" ? "amber" : "green";
                return (
                  <tr key={m.id}>
                    <Td mono>{m.codigo_interno}</Td>
                    <Td><b>{m.nome}</b>{isEpi(m) && m.ca ? <div style={{ fontSize: 11, color: C.inkFaint }}>CA {m.ca}</div> : null}</Td>
                    <Td>{m.categoria}</Td>
                    <Td>{m.localizacao}</Td>
                    <Td mono><b>{m.estoque_atual}</b> {m.unidade}</Td>
                    <Td mono>{m.estoque_minimo} / {m.estoque_maximo}</Td>
                    <Td>{fmtMoney(m.valor_unitario)}</Td>
                    <Td><Badge tone={tone}>{STOCK_LABEL[st]}</Badge></Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!filtered.length ? <EmptyState title="Nenhum material encontrado" sub="Ajuste os filtros de busca" /> : null}
        </div>
      </Card>
    </div>
  );
}

/* ============================== GENERIC MOVEMENT FORM ============================== */
const TIPO_LABEL = {
  entrada: "Entrada de estoque", saida: "Saída de estoque", devolucao: "Devolução",
  danificado: "Material danificado / avariado", perda: "Registro de perda ou extravio",
};
function MovementForm({ tipo, materials, employees, areas, costCenters, currentUser, onSubmit, onlyEpi, presetMaterialId }) {
  const options = onlyEpi ? materials.filter(isEpi) : materials;
  const [materialId, setMaterialId] = useState(presetMaterialId || options[0]?.id || "");
  const material = materials.find((m) => m.id === materialId);
  const [qtd, setQtd] = useState(1);
  const [data, setData] = useState(todayISO());
  const [obs, setObs] = useState("");
  const [err, setErr] = useState("");
  const [alertMsg, setAlertMsg] = useState("");

  // entrada fields
  const [fornecedor, setFornecedor] = useState("");
  const [nf, setNf] = useState("");
  const [pedido, setPedido] = useState("");
  const [valorUnit, setValorUnit] = useState(material?.valor_unitario || 0);
  const [lote, setLote] = useState("");
  const [validade, setValidade] = useState("");
  const [respRecebimento, setRespRecebimento] = useState("");
  const [localArmaz, setLocalArmaz] = useState(material?.localizacao || LOCATIONS_SEED[0]);

  // saida fields
  const [areaDestino, setAreaDestino] = useState(areas[0] || "");
  const [centroCusto, setCentroCusto] = useState(costCenters[0]?.codigo || "");
  const [colaborador, setColaborador] = useState(employees[0]?.nome || "");
  const [matricula, setMatricula] = useState(employees[0]?.matricula || "");
  const [empresa, setEmpresa] = useState("Própria");
  const [supervisor, setSupervisor] = useState("");
  const [turno, setTurno] = useState(TURNOS[0]);
  const [motivo, setMotivo] = useState("");
  const [respEntrega, setRespEntrega] = useState(currentUser?.nome || "");
  const [confirmacao, setConfirmacao] = useState(false);

  // devolucao
  const [responsavelDev, setResponsavelDev] = useState(currentUser?.nome || "");
  const [condicao, setCondicao] = useState(RETURN_COND[0]);

  // danificado / perda
  const [areaOc, setAreaOc] = useState(areas[0] || "");
  const [descricaoDano, setDescricaoDano] = useState("");
  const [supervisorOc, setSupervisorOc] = useState("");
  const [destino, setDestino] = useState("Análise");
  const [ultimoResp, setUltimoResp] = useState("");
  const [registroOcorrencia, setRegistroOcorrencia] = useState("");
  const [planoAcao, setPlanoAcao] = useState("");

  useEffect(() => {
    if (employees.length) { const e = employees[0]; setColaborador(e.nome); setMatricula(e.matricula); }
  }, []);
  useEffect(() => { if (material) setValorUnit(material.valor_unitario); }, [materialId]);

  function onColabChange(nome) {
    setColaborador(nome);
    const e = employees.find((x) => x.nome === nome);
    setMatricula(e?.matricula || "");
  }

  function validateAndSubmit(e) {
    e.preventDefault();
    setErr("");
    if (!material) { setErr("Selecione um material."); return; }
    const q = Number(qtd);
    if (!q || q <= 0) { setErr("Informe uma quantidade válida."); return; }
    if ((tipo === "saida" || tipo === "danificado" || tipo === "perda") && q > material.estoque_atual) {
      setErr(`Quantidade indisponível. Saldo atual: ${material.estoque_atual} ${material.unidade}.`); return;
    }
    if (tipo === "saida" && (!colaborador || !areaDestino || !centroCusto || !motivo)) {
      setErr("Preencha colaborador, área de destino, centro de custo e motivo."); return;
    }
    if (tipo === "saida" && isEpi(material) && !confirmacao) {
      setErr("Confirme o recebimento do EPI pelo colaborador para concluir a entrega."); return;
    }

    const payload = {
      tipo, material_id: material.id, material_nome: material.nome, quantidade: q, data, observacao: obs,
      usuario: currentUser.nome,
    };
    if (tipo === "entrada") Object.assign(payload, { fornecedor, nf, pedido, valor_unitario: valorUnit, lote, validade, responsavel_recebimento: respRecebimento, local_armazenamento: localArmaz });
    if (tipo === "saida") Object.assign(payload, {
      area_destino: areaDestino, centro_custo: centroCusto, colaborador, matricula, empresa, supervisor, turno, motivo,
      responsavel_entrega: respEntrega, ca: isEpi(material) ? material.ca : undefined, data_entrega: isEpi(material) ? data : undefined,
      confirmacao_colaborador: isEpi(material) ? confirmacao : undefined,
    });
    if (tipo === "devolucao") Object.assign(payload, { responsavel: responsavelDev, condicao });
    if (tipo === "danificado") Object.assign(payload, { area: areaOc, motivo, descricao_dano: descricaoDano, supervisor: supervisorOc, destino });
    if (tipo === "perda") Object.assign(payload, { ultimo_responsavel: ultimoResp, area: areaOc, supervisor: supervisorOc, motivo, registro_ocorrencia: registroOcorrencia, plano_acao: planoAcao });

    // EPI over-consumption check (saida)
    if (tipo === "saida" && isEpi(material)) {
      // handled by parent via callback return value
    }
    onSubmit(payload);
  }

  return (
    <form onSubmit={validateAndSubmit}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Field label="Material" required span={2}>
          <TSel value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
            {options.map((m) => <option key={m.id} value={m.id}>{m.codigo_interno} — {m.nome} (saldo: {m.estoque_atual} {m.unidade})</option>)}
          </TSel>
        </Field>
        <Field label="Quantidade" required><TIn type="number" min={1} value={qtd} onChange={(e) => setQtd(e.target.value)} /></Field>
        <Field label="Data" required><TIn type="date" value={data} onChange={(e) => setData(e.target.value)} /></Field>

        {tipo === "entrada" && <>
          <Field label="Fornecedor" required><TIn value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} /></Field>
          <Field label="Número da nota fiscal"><TIn value={nf} onChange={(e) => setNf(e.target.value)} /></Field>
          <Field label="Número do pedido"><TIn value={pedido} onChange={(e) => setPedido(e.target.value)} /></Field>
          <Field label="Valor unitário"><TIn type="number" step="0.01" value={valorUnit} onChange={(e) => setValorUnit(e.target.value)} /></Field>
          <Field label="Valor total"><TIn disabled value={fmtMoney(Number(valorUnit) * Number(qtd || 0))} /></Field>
          <Field label="Lote"><TIn value={lote} onChange={(e) => setLote(e.target.value)} /></Field>
          <Field label="Validade"><TIn type="date" value={validade} onChange={(e) => setValidade(e.target.value)} /></Field>
          <Field label="Responsável pelo recebimento" required><TIn value={respRecebimento} onChange={(e) => setRespRecebimento(e.target.value)} /></Field>
          <Field label="Local de armazenamento" span={2}>
            <TSel value={localArmaz} onChange={(e) => setLocalArmaz(e.target.value)}>{LOCATIONS_SEED.map((l) => <option key={l}>{l}</option>)}</TSel>
          </Field>
        </>}

        {tipo === "saida" && <>
          <Field label="Área de destino" required><TSel value={areaDestino} onChange={(e) => setAreaDestino(e.target.value)}>{areas.map((a) => <option key={a}>{a}</option>)}</TSel></Field>
          <Field label="Centro de custo" required><TSel value={centroCusto} onChange={(e) => setCentroCusto(e.target.value)}>{costCenters.map((c) => <option key={c.id} value={c.codigo}>{c.codigo} — {c.nome}</option>)}</TSel></Field>
          <Field label="Colaborador" required><TSel value={colaborador} onChange={(e) => onColabChange(e.target.value)}>{employees.map((e) => <option key={e.id}>{e.nome}</option>)}</TSel></Field>
          <Field label="Matrícula"><TIn disabled value={matricula} /></Field>
          <Field label="Empresa"><TIn value={empresa} onChange={(e) => setEmpresa(e.target.value)} /></Field>
          <Field label="Supervisor"><TIn value={supervisor} onChange={(e) => setSupervisor(e.target.value)} /></Field>
          <Field label="Turno"><TSel value={turno} onChange={(e) => setTurno(e.target.value)}>{TURNOS.map((t) => <option key={t}>{t}</option>)}</TSel></Field>
          <Field label="Responsável pela entrega"><TIn value={respEntrega} onChange={(e) => setRespEntrega(e.target.value)} /></Field>
          <Field label="Motivo" required span={2}><TArea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: entrega programada de EPI, uso operacional..." /></Field>
          {material && isEpi(material) && <>
            <Field label="CA do EPI"><TIn disabled value={material.ca} /></Field>
            <Field label="Data da entrega"><TIn disabled value={fmtDate(data)} /></Field>
            <div style={{ gridColumn: "span 2", marginBottom: 10 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: C.ink, background: C.amberBg, border: `1px solid ${C.amberBorder}`, borderRadius: 7, padding: 10, cursor: "pointer" }}>
                <input type="checkbox" checked={confirmacao} onChange={(e) => setConfirmacao(e.target.checked)} />
                Colaborador confirma o recebimento deste EPI e foi orientado sobre seu uso correto.
              </label>
            </div>
          </>}
        </>}

        {tipo === "devolucao" && <>
          <Field label="Responsável pela devolução" required><TIn value={responsavelDev} onChange={(e) => setResponsavelDev(e.target.value)} /></Field>
          <Field label="Condição" required>
            <TSel value={condicao} onChange={(e) => setCondicao(e.target.value)}>{RETURN_COND.map((c) => <option key={c}>{c}</option>)}</TSel>
          </Field>
        </>}

        {tipo === "danificado" && <>
          <Field label="Área" required><TSel value={areaOc} onChange={(e) => setAreaOc(e.target.value)}>{areas.map((a) => <option key={a}>{a}</option>)}</TSel></Field>
          <Field label="Supervisor"><TIn value={supervisorOc} onChange={(e) => setSupervisorOc(e.target.value)} /></Field>
          <Field label="Motivo" required><TIn value={motivo} onChange={(e) => setMotivo(e.target.value)} /></Field>
          <Field label="Destino" required>
            <TSel value={destino} onChange={(e) => setDestino(e.target.value)}>{["Manutenção", "Recuperação", "Descarte", "Sucata", "Análise"].map((d) => <option key={d}>{d}</option>)}</TSel>
          </Field>
          <Field label="Descrição do dano" span={2}><TArea value={descricaoDano} onChange={(e) => setDescricaoDano(e.target.value)} /></Field>
        </>}

        {tipo === "perda" && <>
          <Field label="Último responsável" required><TIn value={ultimoResp} onChange={(e) => setUltimoResp(e.target.value)} /></Field>
          <Field label="Área" required><TSel value={areaOc} onChange={(e) => setAreaOc(e.target.value)}>{areas.map((a) => <option key={a}>{a}</option>)}</TSel></Field>
          <Field label="Supervisor"><TIn value={supervisorOc} onChange={(e) => setSupervisorOc(e.target.value)} /></Field>
          <Field label="Motivo" required><TIn value={motivo} onChange={(e) => setMotivo(e.target.value)} /></Field>
          <Field label="Registro da ocorrência" span={2}><TArea value={registroOcorrencia} onChange={(e) => setRegistroOcorrencia(e.target.value)} /></Field>
          <Field label="Plano de ação" span={2}><TArea value={planoAcao} onChange={(e) => setPlanoAcao(e.target.value)} /></Field>
        </>}

        <Field label="Observação" span={2}><TArea value={obs} onChange={(e) => setObs(e.target.value)} /></Field>
      </div>
      {err ? <div style={{ background: C.redBg, border: `1px solid ${C.redBorder}`, color: C.red, borderRadius: 6, padding: "8px 10px", fontSize: 12.5, marginBottom: 12 }}>{err}</div> : null}
      <Btn type="submit" icon={CheckCircle2}>Registrar {TIPO_LABEL[tipo].toLowerCase()}</Btn>
    </form>
  );
}

/* ============================== TRANSFERÊNCIA ============================== */
function TransferenciaPage({ materials, currentUser, movements, onCreate, onConfirm }) {
  const [materialId, setMaterialId] = useState(materials[0]?.id || "");
  const [origem, setOrigem] = useState(LOCATIONS_SEED[0]);
  const [destino, setDestino] = useState(LOCATIONS_SEED[1]);
  const [qtd, setQtd] = useState(1);
  const [err, setErr] = useState("");
  const material = materials.find((m) => m.id === materialId);

  const pendentes = movements.filter((m) => m.tipo === "transferencia" && m.status === "Pendente");

  function submit(e) {
    e.preventDefault();
    if (!material) return;
    if (origem === destino) { setErr("Origem e destino devem ser diferentes."); return; }
    if (Number(qtd) <= 0) { setErr("Informe uma quantidade válida."); return; }
    setErr("");
    onCreate({ tipo: "transferencia", material_id: material.id, material_nome: material.nome, quantidade: Number(qtd), origem, destino, usuario_enviou: currentUser.nome, status: "Pendente" });
  }

  return (
    <div>
      <SectionHeader title="Transferência entre estoques" sub="A transferência só é concluída após confirmação do recebimento." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="two-col">
        <Card>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Nova transferência</div>
          <form onSubmit={submit}>
            <Field label="Material" required>
              <TSel value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
                {materials.map((m) => <option key={m.id} value={m.id}>{m.codigo_interno} — {m.nome}</option>)}
              </TSel>
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
              <Field label="Origem" required><TSel value={origem} onChange={(e) => setOrigem(e.target.value)}>{LOCATIONS_SEED.map((l) => <option key={l}>{l}</option>)}</TSel></Field>
              <Field label="Destino" required><TSel value={destino} onChange={(e) => setDestino(e.target.value)}>{LOCATIONS_SEED.map((l) => <option key={l}>{l}</option>)}</TSel></Field>
            </div>
            <Field label="Quantidade" required><TIn type="number" min={1} value={qtd} onChange={(e) => setQtd(e.target.value)} /></Field>
            {err ? <div style={{ color: C.red, fontSize: 12.5, marginBottom: 10 }}>{err}</div> : null}
            <Btn type="submit" icon={ArrowLeftRight}>Enviar transferência</Btn>
          </form>
        </Card>
        <Card>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Pendentes de confirmação de recebimento</div>
          {pendentes.length ? pendentes.map((p) => (
            <div key={p.id} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{p.material_nome}</div>
              <div style={{ fontSize: 12, color: C.inkMuted, margin: "3px 0 8px" }}>{p.quantidade} un. · {p.origem} → {p.destino} · enviado por {p.usuario_enviou} em {fmtDate(p.timestamp)}</div>
              <Btn size="sm" variant="steel" icon={CheckCircle2} onClick={() => onConfirm(p)}>Confirmar recebimento</Btn>
            </div>
          )) : <EmptyState icon={PackageCheck} title="Nenhuma transferência pendente" />}
        </Card>
      </div>
      <style>{`@media (max-width: 900px) { .two-col { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

/* ============================== EPI ============================== */
function EpiHistorico({ materials, movements, employees }) {
  const [colabName, setColabName] = useState(employees[0]?.nome || "");
  const colab = employees.find((e) => e.nome === colabName);
  const hist = movements.filter((m) => m.tipo === "saida" && m.colaborador === colabName && isEpi(materials.find((x) => x.id === m.material_id) || {}));

  const last15 = hist.filter((m) => daysBetween(m.timestamp, nowStamp()) <= 15);
  const qty15 = last15.reduce((s, m) => s + Number(m.quantidade || 0), 0);

  return (
    <div>
      <SectionHeader title="Histórico de EPI por colaborador" sub="Consulte toda a vida útil de entrega de EPI do colaborador." />
      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
          <Field label="Colaborador" hint={null}><TSel value={colabName} onChange={(e) => setColabName(e.target.value)} style={{ minWidth: 220 }}>{employees.map((e) => <option key={e.id}>{e.nome}</option>)}</TSel></Field>
          {colab && <div style={{ display: "flex", gap: 18, fontSize: 12.5, color: C.inkMuted, marginBottom: 10 }}>
            <div><b style={{ color: C.ink }}>Matrícula:</b> {colab.matricula}</div>
            <div><b style={{ color: C.ink }}>Função:</b> {colab.funcao}</div>
            <div><b style={{ color: C.ink }}>Área:</b> {colab.area}</div>
            <div><b style={{ color: C.ink }}>Turno:</b> {colab.turno}</div>
          </div>}
        </div>
        {qty15 > 3 && (
          <div style={{ background: C.amberBg, border: `1px solid ${C.amberBorder}`, borderRadius: 7, padding: 10, fontSize: 12.5, color: C.amber, display: "flex", alignItems: "center", gap: 8 }}>
            <TriangleAlert size={16} /> Colaborador recebeu {qty15} unidades de EPI nos últimos 15 dias — consumo acima da média.
          </div>
        )}
      </Card>
      <Card pad={0}>
        <table><thead><tr><Th>Data</Th><Th>EPI</Th><Th>CA</Th><Th>Quantidade</Th><Th>Motivo</Th><Th>Responsável</Th></tr></thead>
          <tbody>{hist.slice().reverse().map((m) => (
            <tr key={m.id}><Td>{fmtDate(m.data_entrega || m.timestamp)}</Td><Td>{m.material_nome}</Td><Td mono>{m.ca}</Td><Td mono>{m.quantidade}</Td><Td>{m.motivo}</Td><Td>{m.responsavel_entrega}</Td></tr>
          ))}</tbody>
        </table>
        {!hist.length ? <EmptyState title="Nenhuma entrega de EPI registrada para este colaborador" /> : null}
      </Card>
    </div>
  );
}

function EpiValidade({ materials }) {
  const epis = materials.filter(isEpi).map((m) => ({ ...m, dias: m.validade_ca ? daysBetween(todayISO(), m.validade_ca) : null }))
    .sort((a, b) => (a.dias ?? 9999) - (b.dias ?? 9999));
  return (
    <div>
      <SectionHeader title="Validade de Certificado de Aprovação (CA)" sub="Itens de EPI ordenados por proximidade do vencimento." />
      <Card pad={0}>
        <table><thead><tr><Th>Material</Th><Th>CA</Th><Th>Validade</Th><Th>Situação</Th></tr></thead>
          <tbody>{epis.map((m) => {
            const tone = m.dias == null ? "slate" : m.dias < 0 ? "red" : m.dias <= 60 ? "amber" : "green";
            const label = m.dias == null ? "Sem validade cadastrada" : m.dias < 0 ? `Vencido há ${Math.abs(m.dias)} dias` : `Vence em ${m.dias} dias`;
            return <tr key={m.id}><Td>{m.nome}</Td><Td mono>{m.ca || "—"}</Td><Td>{fmtDate(m.validade_ca)}</Td><Td><Badge tone={tone}>{label}</Badge></Td></tr>;
          })}</tbody>
        </table>
      </Card>
    </div>
  );
}

/* ============================== FERRAMENTAS ============================== */
function ToolsList({ materials, filterStatus }) {
  const tools = materials.filter((m) => m.tipo_item === "ferramenta" && (!filterStatus || m.status_ferramenta === filterStatus));
  const toneFor = (s) => s === "Disponível" ? "green" : s === "Danificada" || s === "Extraviada" ? "red" : s === "Em manutenção" ? "amber" : "steel";
  return (
    <Card pad={0}>
      <table><thead><tr><Th>Código</Th><Th>Ferramenta</Th><Th>Local</Th><Th>Status</Th></tr></thead>
        <tbody>{tools.map((m) => (
          <tr key={m.id}><Td mono>{m.codigo_interno}</Td><Td>{m.nome}</Td><Td>{m.localizacao}</Td><Td><Badge tone={toneFor(m.status_ferramenta)}>{m.status_ferramenta}</Badge></Td></tr>
        ))}</tbody>
      </table>
      {!tools.length ? <EmptyState icon={Wrench} title="Nenhuma ferramenta encontrada" /> : null}
    </Card>
  );
}

function ToolLoanPage({ materials, employees, toolLoans, currentUser, onLoan, onReturn, mode }) {
  const availableTools = materials.filter((m) => m.tipo_item === "ferramenta" && m.status_ferramenta === "Disponível");
  const [toolId, setToolId] = useState(availableTools[0]?.id || "");
  const [colaborador, setColaborador] = useState(employees[0]?.nome || "");
  const [matricula, setMatricula] = useState(employees[0]?.matricula || "");
  const [supervisor, setSupervisor] = useState("");
  const [area, setArea] = useState(AREAS_SEED[0]);
  const [previsao, setPrevisao] = useState(todayISO());

  function onColabChange(nome) { setColaborador(nome); setMatricula(employees.find((e) => e.nome === nome)?.matricula || ""); }

  function submitLoan(e) {
    e.preventDefault();
    const tool = materials.find((m) => m.id === toolId);
    if (!tool) return;
    onLoan({ ferramenta_id: tool.id, ferramenta_nome: tool.nome, codigo: tool.codigo_interno, colaborador, matricula, supervisor, area, data_retirada: nowStamp(), previsao_devolucao: previsao, usuario: currentUser.nome });
  }

  const openLoans = toolLoans.filter((l) => !l.data_devolucao);

  if (mode === "devolucoes") {
    return (
      <div>
        <SectionHeader title="Devolução de ferramentas" sub="Registre a condição de retorno de cada ferramenta emprestada." />
        <Card pad={0}>
          <table><thead><tr><Th>Ferramenta</Th><Th>Colaborador</Th><Th>Retirada</Th><Th>Previsão</Th><Th>Situação</Th><Th></Th></tr></thead>
            <tbody>{openLoans.map((l) => {
              const atrasada = l.previsao_devolucao < todayISO();
              return (
                <tr key={l.id}>
                  <Td>{l.ferramenta_nome}</Td><Td>{l.colaborador}</Td><Td>{fmtDate(l.data_retirada)}</Td><Td>{fmtDate(l.previsao_devolucao)}</Td>
                  <Td>{atrasada ? <Badge tone="red">Atrasada</Badge> : <Badge tone="steel">Em uso</Badge>}</Td>
                  <Td><ReturnAction loan={l} onReturn={onReturn} /></Td>
                </tr>
              );
            })}</tbody>
          </table>
          {!openLoans.length ? <EmptyState icon={PackageCheck} title="Nenhum empréstimo em aberto" /> : null}
        </Card>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader title="Empréstimo de ferramentas" sub="Ferramentas seguem controle próprio, separado dos materiais consumíveis." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 16 }} className="two-col">
        <Card>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Registrar retirada</div>
          <form onSubmit={submitLoan}>
            <Field label="Ferramenta" required>
              <TSel value={toolId} onChange={(e) => setToolId(e.target.value)}>
                {availableTools.map((t) => <option key={t.id} value={t.id}>{t.codigo_interno} — {t.nome}</option>)}
              </TSel>
            </Field>
            <Field label="Colaborador" required><TSel value={colaborador} onChange={(e) => onColabChange(e.target.value)}>{employees.map((e) => <option key={e.id}>{e.nome}</option>)}</TSel></Field>
            <Field label="Matrícula"><TIn disabled value={matricula} /></Field>
            <Field label="Supervisor"><TIn value={supervisor} onChange={(e) => setSupervisor(e.target.value)} /></Field>
            <Field label="Área" required><TSel value={area} onChange={(e) => setArea(e.target.value)}>{AREAS_SEED.map((a) => <option key={a}>{a}</option>)}</TSel></Field>
            <Field label="Previsão de devolução" required><TIn type="date" value={previsao} onChange={(e) => setPrevisao(e.target.value)} /></Field>
            <Btn type="submit" icon={Wrench} disabled={!availableTools.length}>Registrar retirada</Btn>
          </form>
        </Card>
        <Card>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Empréstimos em aberto</div>
          {openLoans.length ? (
            <table><thead><tr><Th>Ferramenta</Th><Th>Colaborador</Th><Th>Previsão</Th><Th></Th></tr></thead>
              <tbody>{openLoans.map((l) => {
                const atrasada = l.previsao_devolucao < todayISO();
                return <tr key={l.id}><Td>{l.ferramenta_nome}</Td><Td>{l.colaborador}</Td>
                  <Td>{atrasada ? <Badge tone="red">Atrasada — {fmtDate(l.previsao_devolucao)}</Badge> : fmtDate(l.previsao_devolucao)}</Td>
                  <Td><ReturnAction loan={l} onReturn={onReturn} compact /></Td></tr>;
              })}</tbody>
            </table>
          ) : <EmptyState icon={PackageCheck} title="Nenhum empréstimo em aberto" />}
        </Card>
      </div>
      <style>{`@media (max-width: 900px) { .two-col { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

function ReturnAction({ loan, onReturn, compact }) {
  const [open, setOpen] = useState(false);
  const [condicao, setCondicao] = useState(RETURN_COND[0]);
  if (!open) return <Btn size="sm" variant="ghost" onClick={() => setOpen(true)}>Devolver</Btn>;
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <TSel value={condicao} onChange={(e) => setCondicao(e.target.value)} style={{ width: 150, padding: "5px 6px", fontSize: 12 }}>
        {RETURN_COND.map((c) => <option key={c}>{c}</option>)}
      </TSel>
      <Btn size="sm" variant="steel" onClick={() => { onReturn(loan, condicao); setOpen(false); }}>OK</Btn>
    </div>
  );
}

/* ============================== INVENTÁRIO ============================== */
function InventarioContagem({ materials, currentUser, onSubmit }) {
  const [materialId, setMaterialId] = useState(materials[0]?.id || "");
  const [fisico, setFisico] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const material = materials.find((m) => m.id === materialId);
  const diff = fisico === "" ? null : Number(fisico) - Number(material?.estoque_atual || 0);

  function submit(e) {
    e.preventDefault();
    if (fisico === "" || !material) return;
    if (diff !== 0 && !justificativa.trim()) return;
    onSubmit({
      tipo: "ajuste", material_id: material.id, material_nome: material.nome,
      quantidade_anterior: material.estoque_atual, quantidade_fisica: Number(fisico), diferenca: diff,
      justificativa: justificativa || "Contagem conferida sem divergência.", usuario: currentUser.nome,
      status: diff === 0 ? "Aprovado" : "Pendente Aprovação",
    });
    setFisico(""); setJustificativa("");
  }

  return (
    <div>
      <SectionHeader title="Nova contagem de inventário" sub="O saldo do sistema nunca é alterado diretamente — toda diferença gera um ajuste de inventário auditado." />
      <Card style={{ maxWidth: 520 }}>
        <form onSubmit={submit}>
          <Field label="Material" required>
            <TSel value={materialId} onChange={(e) => { setMaterialId(e.target.value); setFisico(""); }}>
              {materials.map((m) => <option key={m.id} value={m.id}>{m.codigo_interno} — {m.nome}</option>)}
            </TSel>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
            <Field label="Quantidade sistema"><TIn disabled value={material?.estoque_atual ?? ""} /></Field>
            <Field label="Quantidade física" required><TIn type="number" value={fisico} onChange={(e) => setFisico(e.target.value)} /></Field>
          </div>
          {diff !== null && (
            <div style={{ marginBottom: 12 }}>
              <Badge tone={diff === 0 ? "green" : diff < 0 ? "red" : "amber"}>Diferença: {diff > 0 ? "+" : ""}{diff}</Badge>
            </div>
          )}
          {diff !== 0 && diff !== null && (
            <Field label="Justificativa da divergência" required>
              <TArea value={justificativa} onChange={(e) => setJustificativa(e.target.value)} placeholder="Explique o motivo da diferença encontrada..." />
            </Field>
          )}
          <Btn type="submit" icon={ClipboardCheck} disabled={fisico === ""}>Registrar contagem</Btn>
        </form>
      </Card>
    </div>
  );
}

function InventarioDivergencias({ movements, currentUser, onApprove }) {
  const ajustes = movements.filter((m) => m.tipo === "ajuste");
  const pendentes = ajustes.filter((m) => m.status === "Pendente Aprovação");
  const canApprove = can(currentUser, "aprovarAjuste") || (PERMS[currentUser.perfil] || {}).all;
  return (
    <div>
      <SectionHeader title="Divergências de inventário" sub="Ajustes com diferença aguardam aprovação do gestor ou administrador antes de alterar o saldo." />
      <Card pad={0} style={{ marginBottom: 16 }}>
        <table><thead><tr><Th>Data</Th><Th>Material</Th><Th>Sistema</Th><Th>Físico</Th><Th>Diferença</Th><Th>Justificativa</Th><Th>Situação</Th><Th></Th></tr></thead>
          <tbody>{ajustes.slice().reverse().map((m) => (
            <tr key={m.id}>
              <Td>{fmtDate(m.timestamp)}</Td><Td>{m.material_nome}</Td><Td mono>{m.quantidade_anterior}</Td><Td mono>{m.quantidade_fisica}</Td>
              <Td><Badge tone={m.diferenca === 0 ? "green" : m.diferenca < 0 ? "red" : "amber"}>{m.diferenca > 0 ? "+" : ""}{m.diferenca}</Badge></Td>
              <Td style={{ maxWidth: 220 }}>{m.justificativa}</Td>
              <Td><Badge tone={m.status === "Aprovado" ? "green" : "amber"}>{m.status}</Badge></Td>
              <Td>{m.status === "Pendente Aprovação" && canApprove ? <Btn size="sm" variant="steel" icon={CheckCircle2} onClick={() => onApprove(m)}>Aprovar</Btn> : null}</Td>
            </tr>
          ))}</tbody>
        </table>
        {!ajustes.length ? <EmptyState title="Nenhum ajuste de inventário registrado" /> : null}
      </Card>
      {!canApprove && pendentes.length ? <div style={{ fontSize: 12.5, color: C.inkMuted }}>Apenas Gestor ou Administrador podem aprovar ajustes de estoque.</div> : null}
    </div>
  );
}

/* ============================== RELATÓRIOS ============================== */
function RelatoriosPage({ materials, movements }) {
  const reports = [
    { label: "Estoque atual", rows: () => materials.map((m) => ({ Codigo: m.codigo_interno, Material: m.nome, Categoria: m.categoria, Saldo: m.estoque_atual, Minimo: m.estoque_minimo, Situacao: STOCK_LABEL[classifyStock(m)] })) },
    { label: "Movimentação de estoque (geral)", rows: () => movements.map((m) => ({ Data: fmtDate(m.timestamp), Tipo: m.tipo, Material: m.material_nome, Quantidade: m.quantidade ?? m.quantidade_fisica, Usuario: m.usuario })) },
    { label: "Entradas", rows: () => movements.filter((m) => m.tipo === "entrada").map((m) => ({ Data: fmtDate(m.timestamp), Material: m.material_nome, Quantidade: m.quantidade, Fornecedor: m.fornecedor, NF: m.nf })) },
    { label: "Saídas", rows: () => movements.filter((m) => m.tipo === "saida").map((m) => ({ Data: fmtDate(m.timestamp), Material: m.material_nome, Quantidade: m.quantidade, Colaborador: m.colaborador, Area: m.area_destino, CentroCusto: m.centro_custo })) },
    { label: "EPI por colaborador", rows: () => movements.filter((m) => m.tipo === "saida" && m.ca).map((m) => ({ Data: fmtDate(m.timestamp), Colaborador: m.colaborador, EPI: m.material_nome, CA: m.ca, Quantidade: m.quantidade })) },
    { label: "Ferramentas emprestadas / devolvidas", rows: () => movements.filter((m) => m.tipo === "devolucao").map((m) => ({ Data: fmtDate(m.timestamp), Material: m.material_nome, Responsavel: m.responsavel, Condicao: m.condicao })) },
    { label: "Materiais danificados", rows: () => movements.filter((m) => m.tipo === "danificado").map((m) => ({ Data: fmtDate(m.timestamp), Material: m.material_nome, Quantidade: m.quantidade, Motivo: m.motivo, Destino: m.destino })) },
    { label: "Materiais extraviados / perdidos", rows: () => movements.filter((m) => m.tipo === "perda").map((m) => ({ Data: fmtDate(m.timestamp), Material: m.material_nome, Quantidade: m.quantidade, UltimoResponsavel: m.ultimo_responsavel, Area: m.area })) },
    { label: "Estoque mínimo (itens críticos)", rows: () => materials.filter((m) => classifyStock(m) !== "normal").map((m) => ({ Material: m.nome, Saldo: m.estoque_atual, Minimo: m.estoque_minimo, Situacao: STOCK_LABEL[classifyStock(m)] })) },
    { label: "Materiais próximos do vencimento (CA)", rows: () => materials.filter((m) => isEpi(m) && m.validade_ca).map((m) => ({ Material: m.nome, CA: m.ca, Validade: fmtDate(m.validade_ca), DiasRestantes: daysBetween(todayISO(), m.validade_ca) })) },
    { label: "Ajustes de inventário", rows: () => movements.filter((m) => m.tipo === "ajuste").map((m) => ({ Data: fmtDate(m.timestamp), Material: m.material_nome, Anterior: m.quantidade_anterior, Fisico: m.quantidade_fisica, Diferenca: m.diferenca, Status: m.status })) },
  ];
  return (
    <div>
      <SectionHeader title="Relatórios" sub="Exportação em CSV (compatível com Excel). Geração de PDF entra na próxima fase do projeto." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {reports.map((r) => {
          const rows = r.rows();
          return (
            <Card key={r.label} pad={14}>
              <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 3 }}>{r.label}</div>
              <div style={{ fontSize: 12, color: C.inkFaint, marginBottom: 10 }}>{rows.length} registro(s)</div>
              <Btn size="sm" variant="ghost" icon={Download} disabled={!rows.length} onClick={() => downloadCSV(`${r.label.toLowerCase().replace(/[^a-z0-9]+/g, "_")}.csv`, rows)}>Exportar CSV</Btn>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ============================== HISTÓRICO DE MOVIMENTAÇÕES (AUDITORIA) ============================== */
const TIPO_BADGE = {
  entrada: ["Entrada", "green"], saida: ["Saída", "steel"], devolucao: ["Devolução", "slate"],
  transferencia: ["Transferência", "amber"], danificado: ["Danificado", "red"], perda: ["Perda/Extravio", "red"],
  ajuste: ["Ajuste inventário", "amber"],
};
function HistoricoMovimentacoes({ movements, materials }) {
  const [tipo, setTipo] = useState("Todos");
  const [q, setQ] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  const filtered = movements.filter((m) => {
    if (tipo !== "Todos" && m.tipo !== tipo) return false;
    if (de && m.timestamp.slice(0, 10) < de) return false;
    if (ate && m.timestamp.slice(0, 10) > ate) return false;
    if (q) {
      const hay = `${m.material_nome} ${m.usuario} ${m.colaborador || ""} ${m.centro_custo || ""} ${m.area_destino || m.area || ""}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  }).slice().reverse();

  return (
    <div>
      <SectionHeader title="Histórico de movimentações" sub="Registro permanente e não editável de toda alteração de estoque."
        right={<Btn size="sm" variant="ghost" icon={Download} onClick={() => downloadCSV("historico_movimentacoes.csv", filtered.map((m) => ({
          Data: fmtDateTime(m.timestamp), Tipo: TIPO_BADGE[m.tipo]?.[0] || m.tipo, Material: m.material_nome, Usuario: m.usuario,
          QtdAnterior: m.quantidade_anterior, QtdMovimentada: m.quantidade ?? m.quantidade_fisica, QtdFinal: m.quantidade_final,
          CentroCusto: m.centro_custo, Area: m.area_destino || m.area, Observacao: m.observacao,
        })))}>Exportar</Btn>} />
      <Card pad={12} style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: "1 1 200px" }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: 10, color: C.inkFaint }} />
            <TIn placeholder="Material, usuário, colaborador..." value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 30 }} />
          </div>
          <TSel value={tipo} onChange={(e) => setTipo(e.target.value)} style={{ width: 180 }}>
            <option value="Todos">Todos os tipos</option>
            {Object.entries(TIPO_BADGE).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}
          </TSel>
          <TIn type="date" value={de} onChange={(e) => setDe(e.target.value)} style={{ width: 150 }} />
          <TIn type="date" value={ate} onChange={(e) => setAte(e.target.value)} style={{ width: 150 }} />
        </div>
      </Card>
      <Card pad={0}>
        <div style={{ overflowX: "auto" }}>
          <table><thead><tr><Th>Data/Hora</Th><Th>Tipo</Th><Th>Material</Th><Th>Qtd. ant.</Th><Th>Qtd. mov.</Th><Th>Qtd. final</Th><Th>Local/Área</Th><Th>Usuário</Th></tr></thead>
            <tbody>{filtered.map((m) => {
              const [label, tone] = TIPO_BADGE[m.tipo] || [m.tipo, "slate"];
              return (
                <tr key={m.id}>
                  <Td mono>{fmtDateTime(m.timestamp)}</Td>
                  <Td><Badge tone={tone}>{label}</Badge></Td>
                  <Td>{m.material_nome}</Td>
                  <Td mono>{m.quantidade_anterior ?? "—"}</Td>
                  <Td mono>{m.quantidade ?? m.quantidade_fisica ?? "—"}</Td>
                  <Td mono>{m.quantidade_final ?? "—"}</Td>
                  <Td>{m.centro_custo || m.area_destino || m.area || m.origem && `${m.origem} → ${m.destino}` || "—"}</Td>
                  <Td>{m.usuario}</Td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
        {!filtered.length ? <EmptyState title="Nenhuma movimentação encontrada" sub="Ajuste os filtros" /> : null}
      </Card>
    </div>
  );
}

/* ============================== CADASTRO DE MATERIAIS ============================== */
function emptyMaterial() {
  return {
    codigo_interno: "", codigo_sap: "", nome: "", descricao: "", categoria: "EPI", subcategoria: "",
    unidade: "UN", fabricante: "", modelo: "", tamanho: "", ca: "", validade_ca: "", localizacao: LOCATIONS_SEED[0],
    estoque_atual: 0, estoque_minimo: 0, estoque_maximo: 0, ponto_reposicao: 0, valor_unitario: 0,
    situacao: "Ativo", tipo_item: "consumivel", status_ferramenta: "Disponível",
  };
}
function MaterialForm({ initial, categories, onSave, onCancel }) {
  const [f, setF] = useState(initial || emptyMaterial());
  const set = (k) => (e) => setF({ ...f, [k]: e.target?.type === "checkbox" ? e.target.checked : e.target.value });
  const subcats = categories[f.categoria] || [];
  function submit(e) { e.preventDefault(); if (!f.codigo_interno || !f.nome) return; onSave(f); }
  return (
    <form onSubmit={submit}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Field label="Código interno" required><TIn value={f.codigo_interno} onChange={set("codigo_interno")} /></Field>
        <Field label="Código SAP"><TIn value={f.codigo_sap} onChange={set("codigo_sap")} /></Field>
        <Field label="Nome do material" required span={2}><TIn value={f.nome} onChange={set("nome")} /></Field>
        <Field label="Descrição" span={2}><TArea value={f.descricao} onChange={set("descricao")} /></Field>
        <Field label="Categoria" required>
          <TSel value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value, subcategoria: "", tipo_item: e.target.value === "Ferramentas" ? f.tipo_item : "consumivel" })}>
            {Object.keys(categories).map((c) => <option key={c}>{c}</option>)}
          </TSel>
        </Field>
        <Field label="Subcategoria"><TSel value={f.subcategoria} onChange={set("subcategoria")}><option value="">—</option>{subcats.map((s) => <option key={s}>{s}</option>)}</TSel></Field>
        <Field label="Unidade" required><TSel value={f.unidade} onChange={set("unidade")}>{UNIDADES.map((u) => <option key={u}>{u}</option>)}</TSel></Field>
        <Field label="Fabricante"><TIn value={f.fabricante} onChange={set("fabricante")} /></Field>
        <Field label="Modelo"><TIn value={f.modelo} onChange={set("modelo")} /></Field>
        <Field label="Tamanho"><TIn value={f.tamanho} onChange={set("tamanho")} /></Field>
        {f.categoria === "EPI" && <>
          <Field label="CA — Certificado de Aprovação"><TIn value={f.ca} onChange={set("ca")} /></Field>
          <Field label="Validade do CA"><TIn type="date" value={f.validade_ca} onChange={set("validade_ca")} /></Field>
        </>}
        {f.categoria === "Ferramentas" && (
          <Field label="Tipo de item" span={2}>
            <TSel value={f.tipo_item} onChange={set("tipo_item")}>
              <option value="consumivel">Consumível (controlado por saldo)</option>
              <option value="ferramenta">Ferramenta (controlada por status/empréstimo)</option>
            </TSel>
          </Field>
        )}
        <Field label="Localização física"><TSel value={f.localizacao} onChange={set("localizacao")}>{LOCATIONS_SEED.map((l) => <option key={l}>{l}</option>)}</TSel></Field>
        <Field label="Situação"><TSel value={f.situacao} onChange={set("situacao")}>{SITUACOES.map((s) => <option key={s}>{s}</option>)}</TSel></Field>
        <Field label="Estoque atual" required><TIn type="number" value={f.estoque_atual} onChange={set("estoque_atual")} /></Field>
        <Field label="Estoque mínimo" required><TIn type="number" value={f.estoque_minimo} onChange={set("estoque_minimo")} /></Field>
        <Field label="Estoque máximo"><TIn type="number" value={f.estoque_maximo} onChange={set("estoque_maximo")} /></Field>
        <Field label="Ponto de reposição"><TIn type="number" value={f.ponto_reposicao} onChange={set("ponto_reposicao")} /></Field>
        <Field label="Valor unitário" span={2}><TIn type="number" step="0.01" value={f.valor_unitario} onChange={set("valor_unitario")} /></Field>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn type="submit" icon={CheckCircle2}>Salvar material</Btn>
        <Btn type="button" variant="ghost" onClick={onCancel}>Cancelar</Btn>
      </div>
    </form>
  );
}

function CadastroMateriais({ materials, categories, onSave, onAddCategory }) {
  const [modal, setModal] = useState(null); // material being edited, or {} for new
  const [newCat, setNewCat] = useState("");
  const [showCat, setShowCat] = useState(false);
  return (
    <div>
      <SectionHeader title="Cadastro de materiais" sub={`${materials.length} materiais cadastrados`}
        right={<>
          <Btn size="sm" variant="ghost" icon={Plus} onClick={() => setShowCat(true)}>Nova categoria</Btn>
          <Btn size="sm" icon={Plus} onClick={() => setModal(emptyMaterial())}>Novo material</Btn>
        </>} />
      <Card pad={0}>
        <div style={{ overflowX: "auto" }}>
          <table><thead><tr><Th>Código</Th><Th>Material</Th><Th>Categoria</Th><Th>Unidade</Th><Th>Saldo</Th><Th>Situação</Th><Th></Th></tr></thead>
            <tbody>{materials.map((m) => (
              <tr key={m.id}>
                <Td mono>{m.codigo_interno}</Td><Td>{m.nome}</Td><Td>{m.categoria}{m.subcategoria ? ` / ${m.subcategoria}` : ""}</Td>
                <Td>{m.unidade}</Td><Td mono>{m.estoque_atual}</Td>
                <Td><Badge tone={m.situacao === "Ativo" ? "green" : m.situacao === "Bloqueado" ? "red" : "slate"}>{m.situacao}</Badge></Td>
                <Td><Btn size="sm" variant="ghost" onClick={() => setModal(m)}>Editar</Btn></Td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Card>
      {modal && (
        <Modal title={modal.id ? "Editar material" : "Novo material"} onClose={() => setModal(null)} width={720}>
          <MaterialForm initial={modal} categories={categories} onCancel={() => setModal(null)} onSave={(f) => { onSave(f); setModal(null); }} />
        </Modal>
      )}
      {showCat && (
        <Modal title="Nova categoria" onClose={() => setShowCat(false)} width={420}>
          <Field label="Nome da categoria" required><TIn value={newCat} onChange={(e) => setNewCat(e.target.value)} /></Field>
          <Btn onClick={() => { if (newCat.trim()) { onAddCategory(newCat.trim()); setNewCat(""); setShowCat(false); } }}>Adicionar</Btn>
        </Modal>
      )}
    </div>
  );
}

/* ============================== CADASTROS GERAIS ============================== */
function SimpleCrudTable({ title, items, columns, onAdd, formFields, initial }) {
  const [modal, setModal] = useState(null);
  return (
    <Card pad={0}>
      <div style={{ padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontWeight: 700 }}>{title}</div>
        <Btn size="sm" icon={Plus} onClick={() => setModal({ ...initial })}>Adicionar</Btn>
      </div>
      <table><thead><tr>{columns.map((c) => <Th key={c.key}>{c.label}</Th>)}</tr></thead>
        <tbody>{items.map((it) => (
          <tr key={it.id}>{columns.map((c) => <Td key={c.key}>{it[c.key]}</Td>)}</tr>
        ))}</tbody>
      </table>
      {!items.length ? <EmptyState title="Nenhum registro" /> : null}
      {modal && (
        <Modal title={`Novo registro — ${title}`} onClose={() => setModal(null)} width={420}>
          <form onSubmit={(e) => { e.preventDefault(); onAdd(modal); setModal(null); }}>
            {formFields.map((f) => (
              <Field key={f.key} label={f.label} required={f.required}>
                {f.type === "select"
                  ? <TSel value={modal[f.key] || ""} onChange={(e) => setModal({ ...modal, [f.key]: e.target.value })}>{f.options.map((o) => <option key={o}>{o}</option>)}</TSel>
                  : <TIn value={modal[f.key] || ""} onChange={(e) => setModal({ ...modal, [f.key]: e.target.value })} />}
              </Field>
            ))}
            <Btn type="submit">Salvar</Btn>
          </form>
        </Modal>
      )}
    </Card>
  );
}

function CadastroColaboradores({ employees, areas, onAdd }) {
  return (
    <div>
      <SectionHeader title="Cadastro de colaboradores" sub={`${employees.length} colaboradores`} />
      <SimpleCrudTable
        title="Colaboradores" items={employees}
        columns={[{ key: "nome", label: "Nome" }, { key: "matricula", label: "Matrícula" }, { key: "funcao", label: "Função" }, { key: "area", label: "Área" }, { key: "turno", label: "Turno" }]}
        initial={{ nome: "", matricula: "", funcao: "", area: areas[0], turno: TURNOS[0] }}
        formFields={[
          { key: "nome", label: "Nome", required: true }, { key: "matricula", label: "Matrícula", required: true },
          { key: "funcao", label: "Função", required: true }, { key: "area", label: "Área", type: "select", options: areas },
          { key: "turno", label: "Turno", type: "select", options: TURNOS },
        ]}
        onAdd={(f) => onAdd({ id: uid("FUNC"), ...f })}
      />
    </div>
  );
}

function CadastroAreas({ areas, costCenters, onAddArea, onAddCC }) {
  return (
    <div>
      <SectionHeader title="Áreas e centros de custo" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="two-col">
        <SimpleCrudTable title="Áreas" items={areas.map((a, i) => ({ id: i, nome: a }))} columns={[{ key: "nome", label: "Área" }]}
          initial={{ nome: "" }} formFields={[{ key: "nome", label: "Nome da área", required: true }]}
          onAdd={(f) => onAddArea(f.nome)} />
        <SimpleCrudTable title="Centros de custo" items={costCenters} columns={[{ key: "codigo", label: "Código" }, { key: "nome", label: "Nome" }]}
          initial={{ codigo: "", nome: "" }} formFields={[{ key: "codigo", label: "Código", required: true }, { key: "nome", label: "Nome", required: true }]}
          onAdd={(f) => onAddCC({ id: uid("CC"), ...f })} />
      </div>
      <style>{`@media (max-width: 900px) { .two-col { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

function CadastroFornecedores({ suppliers, onAdd }) {
  return (
    <div>
      <SectionHeader title="Fornecedores" sub={`${suppliers.length} fornecedores`} />
      <SimpleCrudTable title="Fornecedores" items={suppliers} columns={[{ key: "nome", label: "Nome" }, { key: "cnpj", label: "CNPJ" }, { key: "contato", label: "Contato" }]}
        initial={{ nome: "", cnpj: "", contato: "" }}
        formFields={[{ key: "nome", label: "Nome", required: true }, { key: "cnpj", label: "CNPJ" }, { key: "contato", label: "Contato" }]}
        onAdd={(f) => onAdd({ id: uid("FORN"), ...f })} />
    </div>
  );
}

/* ============================== ADMINISTRAÇÃO ============================== */
function AdminUsuarios({ users, onAdd, onToggleBlock }) {
  const [modal, setModal] = useState(null);
  return (
    <div>
      <SectionHeader title="Usuários e perfis de acesso" sub={`${users.length} usuários cadastrados`}
        right={<Btn size="sm" icon={Plus} onClick={() => setModal({ nome: "", email: "", senha: "", perfil: "consulta" })}>Novo usuário</Btn>} />
      <Card pad={0} style={{ marginBottom: 18 }}>
        <table><thead><tr><Th>Nome</Th><Th>E-mail</Th><Th>Perfil</Th><Th>Situação</Th><Th></Th></tr></thead>
          <tbody>{users.map((u) => (
            <tr key={u.id}>
              <Td>{u.nome}</Td><Td mono>{u.email}</Td><Td><Badge tone="steel">{ROLE_LABEL[u.perfil]}</Badge></Td>
              <Td><Badge tone={u.bloqueado ? "red" : "green"}>{u.bloqueado ? "Bloqueado" : "Ativo"}</Badge></Td>
              <Td><Btn size="sm" variant={u.bloqueado ? "steel" : "ghost"} onClick={() => onToggleBlock(u)}>{u.bloqueado ? "Desbloquear" : "Bloquear"}</Btn></Td>
            </tr>
          ))}</tbody>
        </table>
      </Card>
      <Card>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Permissões por perfil</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 10 }}>
          {[
            ["Administrador", "Acesso total: usuários, materiais, ajustes, relatórios, configurações e exportações."],
            ["Gestor", "Consulta, entradas/saídas, relatórios, movimentações e aprovação de ajustes de estoque."],
            ["Almoxarife / Estoquista", "Entrada, saída, devolução, material danificado, transferência e consulta de saldo."],
            ["Consulta", "Somente visualização."],
          ].map(([t, d]) => (
            <div key={t} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{t}</div>
              <div style={{ fontSize: 12, color: C.inkMuted }}>{d}</div>
            </div>
          ))}
        </div>
      </Card>
      {modal && (
        <Modal title="Novo usuário" onClose={() => setModal(null)} width={420}>
          <form onSubmit={(e) => { e.preventDefault(); if (!modal.nome || !modal.email || !modal.senha) return; onAdd({ id: uid("USR"), bloqueado: false, ...modal }); setModal(null); }}>
            <Field label="Nome" required><TIn value={modal.nome} onChange={(e) => setModal({ ...modal, nome: e.target.value })} /></Field>
            <Field label="E-mail" required><TIn type="email" value={modal.email} onChange={(e) => setModal({ ...modal, email: e.target.value })} /></Field>
            <Field label="Senha provisória" required><TIn value={modal.senha} onChange={(e) => setModal({ ...modal, senha: e.target.value })} /></Field>
            <Field label="Perfil" required>
              <TSel value={modal.perfil} onChange={(e) => setModal({ ...modal, perfil: e.target.value })}>
                {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </TSel>
            </Field>
            <Btn type="submit">Criar usuário</Btn>
          </form>
        </Modal>
      )}
    </div>
  );
}

function AdminLogs({ auditLog }) {
  return (
    <div>
      <SectionHeader title="Logs de auditoria" sub="Registro protegido de alterações administrativas — não pode ser apagado, nem pelo administrador." />
      <Card pad={0}>
        <table><thead><tr><Th>Data/Hora</Th><Th>Usuário</Th><Th>Tela</Th><Th>Ação</Th></tr></thead>
          <tbody>{auditLog.slice().reverse().map((l) => (
            <tr key={l.id}><Td mono>{fmtDateTime(l.timestamp)}</Td><Td>{l.usuario}</Td><Td>{l.tela}</Td><Td>{l.acao}</Td></tr>
          ))}</tbody>
        </table>
      </Card>
    </div>
  );
}

/* ============================== APP ROOT ============================== */
const STORAGE_KEY = "estoque_li_v1";

export default function App() {
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY, true);
        const parsed = JSON.parse(res.value);
        setData(parsed);
      } catch (e) {
        const seed = buildSeed();
        try { await window.storage.set(STORAGE_KEY, JSON.stringify(seed), true); } catch (e2) { setLoadError(true); }
        setData(seed);
      }
    })();
  }, []);

  const persist = useCallback(async (next) => {
    setData(next);
    try { await window.storage.set(STORAGE_KEY, JSON.stringify(next), true); }
    catch (e) { console.error("Falha ao salvar dados", e); }
  }, []);

  function showToast(msg, tone = "green") {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 3200);
  }

  function logAudit(next, usuario, tela, acao) {
    next.auditLog = [...next.auditLog, { id: uid("LOG"), timestamp: nowStamp(), usuario, tela, acao }];
  }

  /* ---------- movement engine ---------- */
  function registrarMovimentacao(payload) {
    const next = structuredClone(data);
    const mat = next.materials.find((m) => m.id === payload.material_id);
    if (!mat) return;
    const anterior = Number(mat.estoque_atual) || 0;
    let final = anterior;
    const qtd = Number(payload.quantidade) || 0;

    if (payload.tipo === "entrada") final = anterior + qtd;
    if (payload.tipo === "saida") final = anterior - qtd;
    if (payload.tipo === "devolucao") final = payload.condicao === "Sucata" ? anterior : anterior + qtd;
    if (payload.tipo === "danificado") final = anterior - qtd;
    if (payload.tipo === "perda") final = anterior - qtd;
    if (payload.tipo === "transferencia") final = anterior; // saldo total não muda, só localização

    const mov = { id: uid("MOV"), timestamp: nowStamp(), status: payload.status || "Concluída", ...payload, quantidade_anterior: anterior, quantidade_final: final };
    next.movements = [...next.movements, mov];

    if (payload.tipo !== "transferencia") mat.estoque_atual = final;
    mat.updated_at = nowStamp();

    next.materials = next.materials.map((m) => (m.id === mat.id ? mat : m));
    persist(next);
    showToast(`${TIPO_LABEL[payload.tipo] || "Movimentação"} registrada com sucesso.`);
  }

  function confirmTransferencia(mov) {
    const next = structuredClone(data);
    next.movements = next.movements.map((m) => m.id === mov.id ? { ...m, status: "Concluída", usuario_recebeu: currentUser.nome, data_recebimento: nowStamp() } : m);
    const mat = next.materials.find((m) => m.id === mov.material_id);
    if (mat) { mat.localizacao = mov.destino; mat.updated_at = nowStamp(); }
    next.materials = next.materials.map((m) => (m.id === mat.id ? mat : m));
    persist(next);
    showToast("Recebimento confirmado — transferência concluída.");
  }

  function registrarInventario(payload) {
    const next = structuredClone(data);
    const mov = { id: uid("MOV"), timestamp: nowStamp(), tipo: "ajuste", ...payload };
    next.movements = [...next.movements, mov];
    if (payload.status === "Aprovado") {
      const mat = next.materials.find((m) => m.id === payload.material_id);
      if (mat) { mat.estoque_atual = payload.quantidade_fisica; mat.updated_at = nowStamp(); }
      next.materials = next.materials.map((m) => (m.id === mat.id ? mat : m));
    }
    persist(next);
    showToast(payload.status === "Aprovado" ? "Contagem registrada — sem divergência." : "Divergência registrada, aguardando aprovação.", payload.status === "Aprovado" ? "green" : "amber");
  }

  function aprovarAjuste(mov) {
    const next = structuredClone(data);
    const mat = next.materials.find((m) => m.id === mov.material_id);
    if (mat) { mat.estoque_atual = mov.quantidade_fisica; mat.updated_at = nowStamp(); }
    next.materials = next.materials.map((m) => (m.id === mat.id ? mat : m));
    next.movements = next.movements.map((m) => (m.id === mov.id ? { ...m, status: "Aprovado", aprovado_por: currentUser.nome, data_aprovacao: nowStamp() } : m));
    logAudit(next, currentUser.nome, "Inventário / Divergências", `Aprovou ajuste de ${mov.material_nome} (${mov.quantidade_anterior} → ${mov.quantidade_fisica}).`);
    persist(next);
    showToast("Ajuste aprovado — saldo atualizado.");
  }

  function loanTool(payload) {
    const next = structuredClone(data);
    const loan = { id: uid("EMP"), data_devolucao: null, condicao_devolucao: null, ...payload };
    next.toolLoans = [...next.toolLoans, loan];
    const mat = next.materials.find((m) => m.id === payload.ferramenta_id);
    if (mat) { mat.status_ferramenta = "Emprestada"; mat.updated_at = nowStamp(); }
    next.materials = next.materials.map((m) => (m.id === mat.id ? mat : m));
    next.movements = [...next.movements, { id: uid("MOV"), timestamp: nowStamp(), tipo: "emprestimo", material_id: mat.id, material_nome: mat.nome, colaborador: payload.colaborador, usuario: payload.usuario, area: payload.area, observacao: `Previsão de devolução: ${fmtDate(payload.previsao_devolucao)}` }];
    persist(next);
    showToast("Retirada de ferramenta registrada.");
  }

  function returnTool(loan, condicao) {
    const next = structuredClone(data);
    next.toolLoans = next.toolLoans.map((l) => (l.id === loan.id ? { ...l, data_devolucao: nowStamp(), condicao_devolucao: condicao } : l));
    const mat = next.materials.find((m) => m.id === loan.ferramenta_id);
    if (mat) {
      mat.status_ferramenta = condicao === "Boa" ? "Disponível" : condicao === "Danificada" ? "Danificada" : condicao === "Necessita manutenção" ? "Em manutenção" : "Baixada";
      mat.updated_at = nowStamp();
    }
    next.materials = next.materials.map((m) => (m.id === mat.id ? mat : m));
    next.movements = [...next.movements, { id: uid("MOV"), timestamp: nowStamp(), tipo: "devolucao", material_id: mat.id, material_nome: mat.nome, quantidade: 1, quantidade_anterior: null, quantidade_final: null, responsavel: currentUser.nome, condicao, colaborador: loan.colaborador, usuario: currentUser.nome, observacao: "Devolução de ferramenta emprestada." }];
    persist(next);
    showToast("Devolução registrada.");
  }

  function saveMaterial(f) {
    const next = structuredClone(data);
    if (f.id) {
      next.materials = next.materials.map((m) => (m.id === f.id ? { ...m, ...f, updated_at: nowStamp(), updated_by: currentUser.nome } : m));
      logAudit(next, currentUser.nome, "Cadastros / Materiais", `Editou o material ${f.nome} (${f.codigo_interno}).`);
    } else {
      const nm = { ...f, id: uid("MAT"), created_at: nowStamp(), created_by: currentUser.nome, updated_at: nowStamp() };
      next.materials = [...next.materials, nm];
      logAudit(next, currentUser.nome, "Cadastros / Materiais", `Cadastrou o material ${nm.nome} (${nm.codigo_interno}).`);
    }
    persist(next);
    showToast("Material salvo com sucesso.");
  }

  function addCategory(name) {
    const next = structuredClone(data);
    if (!next.categories[name]) next.categories[name] = [];
    logAudit(next, currentUser.nome, "Cadastros / Materiais", `Criou a categoria "${name}".`);
    persist(next);
  }

  function addEmployee(e) { const next = structuredClone(data); next.employees = [...next.employees, e]; persist(next); showToast("Colaborador cadastrado."); }
  function addArea(a) { const next = structuredClone(data); if (!next.areas.includes(a)) next.areas = [...next.areas, a]; persist(next); showToast("Área cadastrada."); }
  function addCC(cc) { const next = structuredClone(data); next.costCenters = [...next.costCenters, cc]; persist(next); showToast("Centro de custo cadastrado."); }
  function addSupplier(s) { const next = structuredClone(data); next.suppliers = [...next.suppliers, s]; persist(next); showToast("Fornecedor cadastrado."); }

  function addUser(u) {
    const next = structuredClone(data);
    next.users = [...next.users, u];
    logAudit(next, currentUser.nome, "Administração / Usuários", `Criou o usuário ${u.nome} (${u.email}) — perfil ${ROLE_LABEL[u.perfil]}.`);
    persist(next);
    showToast("Usuário criado.");
  }
  function toggleBlockUser(u) {
    const next = structuredClone(data);
    next.users = next.users.map((x) => (x.id === u.id ? { ...x, bloqueado: !x.bloqueado } : x));
    logAudit(next, currentUser.nome, "Administração / Usuários", `${u.bloqueado ? "Desbloqueou" : "Bloqueou"} o usuário ${u.nome}.`);
    persist(next);
    showToast(u.bloqueado ? "Usuário desbloqueado." : "Usuário bloqueado.");
  }

  if (!data) {
    return (
      <div className="app-root" style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <GlobalStyle />
        <div style={{ color: C.inkMuted, fontSize: 14 }}>Carregando sistema...</div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage users={data.users} onLogin={setCurrentUser} />;
  }

  const pageTitleMap = {
    "dashboard": <Dashboard data={data} />,
    "stock:consulta": <StockConsulta materials={data.materials} />,
    "stock:entrada": <PageShell title="Entrada de estoque" sub="Registre a entrada de materiais no almoxarifado.">
      <MovementForm tipo="entrada" materials={data.materials} employees={data.employees} areas={data.areas} costCenters={data.costCenters} currentUser={currentUser} onSubmit={registrarMovimentacao} /></PageShell>,
    "stock:saida": <PageShell title="Saída de estoque" sub="Registre a saída de materiais para colaboradores ou áreas.">
      <MovementForm tipo="saida" materials={data.materials} employees={data.employees} areas={data.areas} costCenters={data.costCenters} currentUser={currentUser} onSubmit={registrarMovimentacao} /></PageShell>,
    "stock:transferencia": <TransferenciaPage materials={data.materials} currentUser={currentUser} movements={data.movements} onCreate={registrarMovimentacao} onConfirm={confirmTransferencia} />,
    "stock:devolucao": <PageShell title="Devolução" sub="Registre a devolução de materiais ao estoque.">
      <MovementForm tipo="devolucao" materials={data.materials} employees={data.employees} areas={data.areas} costCenters={data.costCenters} currentUser={currentUser} onSubmit={registrarMovimentacao} /></PageShell>,
    "stock:danificado": <PageShell title="Material danificado / avariado" sub="Registre materiais avariados e seu destino.">
      <MovementForm tipo="danificado" materials={data.materials} employees={data.employees} areas={data.areas} costCenters={data.costCenters} currentUser={currentUser} onSubmit={registrarMovimentacao} /></PageShell>,
    "stock:perda": <PageShell title="Registro de perda ou extravio" sub="Documente ocorrências de perda ou extravio de material.">
      <MovementForm tipo="perda" materials={data.materials} employees={data.employees} areas={data.areas} costCenters={data.costCenters} currentUser={currentUser} onSubmit={registrarMovimentacao} /></PageShell>,
    "epi:entrega": <PageShell title="Entrega de EPI" sub="Fluxo de saída filtrado para itens de EPI, com confirmação de recebimento.">
      <MovementForm tipo="saida" onlyEpi materials={data.materials} employees={data.employees} areas={data.areas} costCenters={data.costCenters} currentUser={currentUser} onSubmit={registrarMovimentacao} /></PageShell>,
    "epi:historico": <EpiHistorico materials={data.materials} movements={data.movements} employees={data.employees} />,
    "epi:validade": <EpiValidade materials={data.materials} />,
    "tools:lista": <PageShell title="Ferramentas disponíveis" sub="Controle de status independente dos materiais consumíveis."><ToolsList materials={data.materials} /></PageShell>,
    "tools:emprestimos": <ToolLoanPage materials={data.materials} employees={data.employees} toolLoans={data.toolLoans} currentUser={currentUser} onLoan={loanTool} onReturn={returnTool} mode="emprestimos" />,
    "tools:devolucoes": <ToolLoanPage materials={data.materials} employees={data.employees} toolLoans={data.toolLoans} currentUser={currentUser} onLoan={loanTool} onReturn={returnTool} mode="devolucoes" />,
    "inv:contagem": <InventarioContagem materials={data.materials} currentUser={currentUser} onSubmit={registrarInventario} />,
    "inv:divergencias": <InventarioDivergencias movements={data.movements} currentUser={currentUser} onApprove={aprovarAjuste} />,
    "historico": <HistoricoMovimentacoes movements={data.movements} materials={data.materials} />,
    "relatorios": <RelatoriosPage materials={data.materials} movements={data.movements} />,
    "cad:materiais": <CadastroMateriais materials={data.materials} categories={data.categories} onSave={saveMaterial} onAddCategory={addCategory} />,
    "cad:colaboradores": <CadastroColaboradores employees={data.employees} areas={data.areas} onAdd={addEmployee} />,
    "cad:areas": <CadastroAreas areas={data.areas} costCenters={data.costCenters} onAddArea={addArea} onAddCC={addCC} />,
    "cad:fornecedores": <CadastroFornecedores suppliers={data.suppliers} onAdd={addSupplier} />,
    "admin:usuarios": <AdminUsuarios users={data.users} onAdd={addUser} onToggleBlock={toggleBlockUser} />,
    "admin:logs": <AdminLogs auditLog={data.auditLog} />,
  };

  return (
    <div className="app-root" style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
      <GlobalStyle />
      {mobileOpen && <div onClick={() => setMobileOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 39 }} className="mobile-overlay" />}
      <div className="sidebar-wrap"><Sidebar user={currentUser} page={page} setPage={setPage} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <TopBar user={currentUser} onLogout={() => setCurrentUser(null)} setMobileOpen={setMobileOpen} />
        <div style={{ padding: "22px 24px 60px", maxWidth: 1240, margin: "0 auto" }}>
          {pageTitleMap[page] || <Dashboard data={data} />}
        </div>
      </div>
      {toast && (
        <div style={{
          position: "fixed", bottom: 20, right: 20, background: toast.tone === "green" ? C.primary : C.amber, color: "#fff",
          padding: "11px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, boxShadow: "0 10px 30px rgba(0,0,0,0.25)", zIndex: 200,
          display: "flex", alignItems: "center", gap: 8,
        }}><CheckCircle2 size={16} /> {toast.msg}</div>
      )}
      <style>{`
        @media (max-width: 880px) {
          .sidebar-wrap { position: fixed; top: 0; left: 0; height: 100vh; z-index: 40; transform: translateX(-100%); transition: transform 0.2s ease; }
          .sidebar-wrap:has(.sidebar) { }
          ${mobileOpen ? ".sidebar-wrap { transform: translateX(0); }" : ""}
          .menu-btn { display: inline-flex !important; }
        }
      `}</style>
    </div>
  );
}

function PageShell({ title, sub, children }) {
  return (
    <div>
      <SectionHeader title={title} sub={sub} />
      <Card style={{ maxWidth: 760 }}>{children}</Card>
    </div>
  );
}
