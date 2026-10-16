import { useState, useEffect, useCallback } from "react";
import { Tv, Radio, Ticket, Lock, Mail, User, ChevronRight, Check, ShieldCheck, QrCode, ArrowLeft, Settings, Sparkles } from "lucide-react";

const CONFIG_KEY = "jayatv:config";
const SALES_KEY = "jayatv:sales";
const ACCOUNT_PREFIX = "jayatv:account:";
const ADMIN_PASS = "jayatv2026";

const DEFAULT_CONFIG = {
  eventName: "ANIVERSARIO JAYATV",
  eventTagline: "¿Estás listo?",
  eventDate: "24 de octubre",
  eventPlace: "A confirmar",
  general: 8000,
  vip: 15000,
  feePercent: 10,
  rrppAmount: 500,
};

function getParam(name) {
  try {
    return new URLSearchParams(window.location.search).get(name);
  } catch {
    return null;
  }
}

function money(n) {
  return "$ " + Math.round(n).toLocaleString("es-AR");
}

function uid(prefix = "") {
  return prefix + Math.random().toString(36).slice(2, 9).toUpperCase();
}

// Local-dev storage: plain browser localStorage (per-browser, not shared
// between visitors). When you move this to a real backend, swap these two
// functions for calls to your API / database and nothing else needs to change.
async function storageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

async function storageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage unavailable (private browsing, etc.) — data just won't persist
  }
}

function Scanlines() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        backgroundImage:
          "repeating-linear-gradient(0deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 3px)",
        mixBlendMode: "overlay",
      }}
    />
  );
}

function Chip({ children }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        border: "1px solid rgba(47,232,255,0.4)",
        color: "#7CF3FF",
        fontFamily: "'Space Mono', monospace",
        fontSize: 11,
        letterSpacing: 1,
      }}
    >
      {children}
    </span>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [sales, setSales] = useState([]);
  const [screen, setScreen] = useState("home"); // home | account | buy | pay | confirm | admin
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [rrpp] = useState(() => getParam("rrpp") || "");

  const [account, setAccount] = useState(null); // {email}
  const [authForm, setAuthForm] = useState({ email: "", password: "" });
  const [authError, setAuthError] = useState("");

  const [selectedTier, setSelectedTier] = useState("general");
  const [qty, setQty] = useState(1);
  const [buyerForm, setBuyerForm] = useState({ nombre: "", apellido: "" });

  const [lastOrder, setLastOrder] = useState(null);

  const [adminPassInput, setAdminPassInput] = useState("");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminDraft, setAdminDraft] = useState(DEFAULT_CONFIG);

  // load config + sales once
  useEffect(() => {
    (async () => {
      try {
        const cfgValue = await storageGet(CONFIG_KEY);
        if (cfgValue) {
          const parsed = JSON.parse(cfgValue);
          setConfig(parsed);
          setAdminDraft(parsed);
        } else {
          await storageSet(CONFIG_KEY, JSON.stringify(DEFAULT_CONFIG));
        }
      } catch {
        // no config yet, keep defaults
      }
      try {
        const salesValue = await storageGet(SALES_KEY);
        if (salesValue) setSales(JSON.parse(salesValue));
      } catch {
        // no sales yet
      }
      setReady(true);
    })();
  }, []);

  const saveSales = useCallback(async (next) => {
    setSales(next);
    await storageSet(SALES_KEY, JSON.stringify(next));
  }, []);

  const handleAuth = async () => {
    setAuthError("");
    const email = authForm.email.trim().toLowerCase();
    const pass = authForm.password;
    if (!email.endsWith("@gmail.com")) {
      setAuthError("Usá una cuenta de Gmail (terminada en @gmail.com).");
      return;
    }
    if (pass.length < 4) {
      setAuthError("La contraseña necesita al menos 4 caracteres.");
      return;
    }
    setBusy(true);
    const key = ACCOUNT_PREFIX + email;
    let existing = null;
    try {
      const raw = await storageGet(key);
      existing = raw ? JSON.parse(raw) : null;
    } catch {
      existing = null;
    }
    if (existing) {
      if (existing.password !== pass) {
        setAuthError("Esa cuenta ya existe y la contraseña no coincide.");
        setBusy(false);
        return;
      }
    } else {
      await storageSet(key, JSON.stringify({ email, password: pass, createdAt: Date.now() }));
    }
    setAccount({ email });
    setScreen("buy");
    setBusy(false);
  };

  const price = selectedTier === "vip" ? config.vip : config.general;
  const subtotal = price * qty;
  const fee = Math.round(subtotal * (config.feePercent / 100));
  const total = subtotal + fee;
  const rrppEarn = rrpp ? config.rrppAmount * qty : 0;

  const confirmPurchase = async () => {
    if (!buyerForm.nombre.trim() || !buyerForm.apellido.trim()) {
      setError("Completá nombre y apellido.");
      return;
    }
    setError("");
    setBusy(true);
    const orderId = uid("JTV-");
    const ticketIds = Array.from({ length: qty }, (_, i) => `${orderId}-${i + 1}`);
    const order = {
      id: orderId,
      email: account.email,
      nombre: buyerForm.nombre.trim(),
      apellido: buyerForm.apellido.trim(),
      tier: selectedTier,
      qty,
      subtotal,
      fee,
      total,
      rrpp: rrpp || null,
      rrppEarn,
      ticketIds,
      createdAt: Date.now(),
    };
    const next = [...sales, order];
    await saveSales(next);
    setLastOrder(order);
    setBusy(false);
    setScreen("confirm");
  };

  const unlockAdmin = () => {
    if (adminPassInput === ADMIN_PASS) {
      setAdminUnlocked(true);
    } else {
      setError("Contraseña de organizador incorrecta.");
    }
  };

  const saveAdminConfig = async () => {
    setBusy(true);
    await storageSet(CONFIG_KEY, JSON.stringify(adminDraft));
    setConfig(adminDraft);
    setError("");
    setBusy(false);
  };

  const totalRevenue = sales.reduce((a, s) => a + s.total, 0);
  const totalFees = sales.reduce((a, s) => a + s.fee, 0);
  const totalTickets = sales.reduce((a, s) => a + s.qty, 0);
  const rrppTotals = sales.reduce((acc, s) => {
    if (!s.rrpp) return acc;
    acc[s.rrpp] = (acc[s.rrpp] || 0) + s.rrppEarn;
    return acc;
  }, {});

  const shell = {
    minHeight: "100vh",
    background: "radial-gradient(circle at 50% -10%, rgba(255,47,166,0.16) 0%, rgba(40,232,255,0.08) 28%, #150a24 45%, #0a0714 70%, #050308 100%)",
    color: "#EDEDF4",
    fontFamily: "'Inter', system-ui, sans-serif",
    position: "relative",
    overflow: "hidden",
  };

  if (!ready) {
    return (
      <div style={{ ...shell, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Radio size={22} color="#2FE8FF" style={{ marginRight: 8 }} />
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: "#7CF3FF" }}>
          SINTONIZANDO...
        </span>
      </div>
    );
  }

  return (
    <div style={shell}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600;700&display=swap');
        .jtv-h1 { font-family: 'Bebas Neue', sans-serif; letter-spacing: 1px; }
        .jtv-btn { transition: transform .12s ease, box-shadow .12s ease; }
        .jtv-btn:active { transform: scale(0.97); }
        .jtv-card { transition: border-color .15s ease; }
        input::placeholder { color: #6b6b7c; }
      `}</style>
      <Scanlines />

      {/* header */}
      <div style={{ padding: "20px 20px 8px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Tv size={20} color="#FF2FA6" />
          <span className="jtv-h1" style={{ fontSize: 24, color: "#fff" }}>{config.eventName}</span>
        </div>
        <button
          onClick={() => setScreen(screen === "admin" ? "home" : "admin")}
          style={{ background: "none", border: "none", color: "#6b6b7c", cursor: "pointer" }}
          aria-label="Panel del organizador"
        >
          <Settings size={18} />
        </button>
      </div>

      <div style={{ position: "relative", zIndex: 1, padding: "8px 20px 100px", maxWidth: 480, margin: "0 auto" }}>
        {error && (
          <div style={{ background: "rgba(255,46,99,0.12)", border: "1px solid rgba(255,46,99,0.4)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#FF7A96" }}>
            {error}
          </div>
        )}

        {screen === "home" && (
          <>
            <div style={{ marginTop: 10, marginBottom: 22 }}>
              <Chip><Radio size={11} /> AL AIRE · {config.eventDate}</Chip>
              <h1 className="jtv-h1" style={{ fontSize: 46, lineHeight: 1, margin: "14px 0 6px", color: "#fff" }}>
                {config.eventTagline}
              </h1>
              <p style={{ color: "#9a9aad", fontSize: 14, margin: 0 }}>{config.eventPlace}</p>
              {rrpp && (
                <div style={{ marginTop: 10 }}>
                  <Chip><Sparkles size={11} /> INVITADO POR {rrpp.toUpperCase()}</Chip>
                </div>
              )}
            </div>

            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#6b6b7c", marginBottom: 10, letterSpacing: 1 }}>
              ELEGÍ TU SEÑAL
            </div>

            {[
              { key: "general", label: "GENERAL", ch: "CH.01", price: config.general, desc: "Acceso a la transmisión completa." },
              { key: "vip", label: "VIP", ch: "CH.02", price: config.vip, desc: "Zona exclusiva + acceso prioritario." },
            ].map((t) => (
              <button
                key={t.key}
                className="jtv-card"
                onClick={() => { setSelectedTier(t.key); setScreen(account ? "buy" : "account"); }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${t.key === "vip" ? "rgba(255,210,63,0.35)" : "rgba(47,232,255,0.25)"}`,
                  borderRadius: 14,
                  padding: 18,
                  marginBottom: 14,
                  cursor: "pointer",
                  color: "#EDEDF4",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: t.key === "vip" ? "#FFD23F" : "#2FE8FF", marginBottom: 6 }}>
                      {t.ch}
                    </div>
                    <div className="jtv-h1" style={{ fontSize: 22, marginBottom: 4 }}>{t.label}</div>
                    <div style={{ fontSize: 13, color: "#9a9aad" }}>{t.desc}</div>
                  </div>
                  <ChevronRight size={20} color="#6b6b7c" />
                </div>
                <div style={{ marginTop: 14, fontSize: 20, fontWeight: 700 }}>{money(t.price)}</div>
              </button>
            ))}

            <p style={{ fontSize: 12, color: "#54546a", marginTop: 18, lineHeight: 1.5 }}>
              Incluye {config.feePercent}% de cargo por servicio. Después de pagar te llegan las entradas
              con código QR a tu correo, una por entrada.
            </p>
          </>
        )}

        {screen === "account" && (
          <>
            <BackBtn onClick={() => setScreen("home")} />
            <h2 className="jtv-h1" style={{ fontSize: 30, margin: "10px 0 4px" }}>Creá tu cuenta</h2>
            <p style={{ color: "#9a9aad", fontSize: 13, marginBottom: 20 }}>
              Usamos tu Gmail para guardar tus entradas y mandarte los QR.
            </p>

            <Field icon={<Mail size={15} />} label="Gmail">
              <input
                type="email"
                placeholder="tuusuario@gmail.com"
                value={authForm.email}
                onChange={(e) => setAuthForm((f) => ({ ...f, email: e.target.value }))}
                style={inputStyle}
              />
            </Field>
            <Field icon={<Lock size={15} />} label="Contraseña">
              <input
                type="password"
                placeholder="••••••••"
                value={authForm.password}
                onChange={(e) => setAuthForm((f) => ({ ...f, password: e.target.value }))}
                style={inputStyle}
              />
            </Field>

            {authError && <div style={{ color: "#FF7A96", fontSize: 13, marginBottom: 10 }}>{authError}</div>}

            <PrimaryBtn onClick={handleAuth} disabled={busy}>
              {busy ? "Procesando..." : "Continuar"}
            </PrimaryBtn>
            <p style={{ fontSize: 11, color: "#54546a", marginTop: 10 }}>
              Si ya tenés cuenta con ese Gmail, con ingresar la misma contraseña entrás directo.
            </p>
          </>
        )}

        {screen === "buy" && account && (
          <>
            <BackBtn onClick={() => setScreen("home")} />
            <h2 className="jtv-h1" style={{ fontSize: 30, margin: "10px 0 4px" }}>Completá tu compra</h2>
            <p style={{ color: "#9a9aad", fontSize: 13, marginBottom: 18 }}>
              Cuenta: {account.email}
            </p>

            <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              {["general", "vip"].map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTier(t)}
                  className="jtv-btn"
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    borderRadius: 10,
                    border: `1px solid ${selectedTier === t ? "#2FE8FF" : "rgba(255,255,255,0.15)"}`,
                    background: selectedTier === t ? "rgba(47,232,255,0.12)" : "transparent",
                    color: "#fff",
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {t.toUpperCase()} · {money(t === "vip" ? config.vip : config.general)}
                </button>
              ))}
            </div>

            <Field icon={<Ticket size={15} />} label="Cantidad de entradas">
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <StepBtn onClick={() => setQty((q) => Math.max(1, q - 1))}>−</StepBtn>
                <span style={{ fontSize: 18, minWidth: 20, textAlign: "center" }}>{qty}</span>
                <StepBtn onClick={() => setQty((q) => Math.min(10, q + 1))}>+</StepBtn>
              </div>
            </Field>

            <Field icon={<User size={15} />} label="Nombre">
              <input
                placeholder="Enzo"
                value={buyerForm.nombre}
                onChange={(e) => setBuyerForm((f) => ({ ...f, nombre: e.target.value }))}
                style={inputStyle}
              />
            </Field>
            <Field icon={<User size={15} />} label="Apellido">
              <input
                placeholder="Fernández"
                value={buyerForm.apellido}
                onChange={(e) => setBuyerForm((f) => ({ ...f, apellido: e.target.value }))}
                style={inputStyle}
              />
            </Field>

            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 16, margin: "18px 0" }}>
              <Row label={`${selectedTier.toUpperCase()} × ${qty}`} value={money(subtotal)} />
              <Row label={`Cargo por servicio (${config.feePercent}%)`} value={money(fee)} muted />
              <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "10px 0" }} />
              <Row label="Total" value={money(total)} bold />
              {rrpp && (
                <div style={{ marginTop: 10, fontSize: 11, color: "#54546a" }}>
                  Compra con código de {rrpp} — no cambia tu precio.
                </div>
              )}
            </div>

            <PrimaryBtn onClick={() => setScreen("pay")}>Ir a pagar</PrimaryBtn>
          </>
        )}

        {screen === "pay" && (
          <>
            <BackBtn onClick={() => setScreen("buy")} />
            <h2 className="jtv-h1" style={{ fontSize: 30, margin: "10px 0 4px" }}>Pago</h2>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(47,232,255,0.3)", borderRadius: 14, padding: 20, textAlign: "center", margin: "18px 0" }}>
              <ShieldCheck size={26} color="#2FE8FF" style={{ marginBottom: 8 }} />
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Pago de prueba</div>
              <div style={{ fontSize: 12, color: "#9a9aad" }}>
                Acá se conecta Mercado Pago cuando tengas tus credenciales. Por ahora simulamos el pago para probar el flujo.
              </div>
            </div>
            <Row label="Total a pagar" value={money(total)} bold />
            <div style={{ marginTop: 18 }}>
              <PrimaryBtn onClick={confirmPurchase} disabled={busy}>
                {busy ? "Confirmando..." : `Pagar ${money(total)}`}
              </PrimaryBtn>
            </div>
          </>
        )}

        {screen === "confirm" && lastOrder && (
          <>
            <div style={{ textAlign: "center", marginTop: 16, marginBottom: 22 }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(47,232,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <Check size={26} color="#2FE8FF" />
              </div>
              <h2 className="jtv-h1" style={{ fontSize: 28, margin: "0 0 6px" }}>¡Entradas confirmadas!</h2>
              <p style={{ color: "#9a9aad", fontSize: 13 }}>
                Te enviamos {lastOrder.qty} entrada{lastOrder.qty > 1 ? "s" : ""} con QR a {lastOrder.email}
              </p>
            </div>

            {lastOrder.ticketIds.map((tid, i) => (
              <div key={tid} className="jtv-card" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 16, marginBottom: 12, display: "flex", gap: 14, alignItems: "center" }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(tid)}`}
                  alt={`QR entrada ${i + 1}`}
                  width={72}
                  height={72}
                  style={{ borderRadius: 8, background: "#fff" }}
                />
                <div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#7CF3FF", marginBottom: 4 }}>
                    ENTRADA {i + 1} DE {lastOrder.qty}
                  </div>
                  <div style={{ fontWeight: 600 }}>{lastOrder.tier.toUpperCase()}</div>
                  <div style={{ fontSize: 12, color: "#9a9aad" }}>{lastOrder.nombre} {lastOrder.apellido}</div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "#54546a", marginTop: 4 }}>{tid}</div>
                </div>
              </div>
            ))}

            <button
              onClick={() => { setScreen("home"); setLastOrder(null); setBuyerForm({ nombre: "", apellido: "" }); setQty(1); }}
              className="jtv-btn"
              style={{ width: "100%", padding: "14px 0", marginTop: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#EDEDF4", cursor: "pointer" }}
            >
              Volver al inicio
            </button>
          </>
        )}

        {screen === "admin" && (
          <>
            <BackBtn onClick={() => setScreen("home")} />
            <h2 className="jtv-h1" style={{ fontSize: 28, margin: "10px 0 16px" }}>Panel del organizador</h2>

            {!adminUnlocked ? (
              <>
                <Field icon={<Lock size={15} />} label="Contraseña de organizador">
                  <input
                    type="password"
                    value={adminPassInput}
                    onChange={(e) => setAdminPassInput(e.target.value)}
                    style={inputStyle}
                  />
                </Field>
                <PrimaryBtn onClick={unlockAdmin}>Entrar</PrimaryBtn>
              </>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
                  <Stat label="Entradas" value={totalTickets} />
                  <Stat label="Ventas" value={money(totalRevenue)} />
                  <Stat label="Tu cargo" value={money(totalFees)} />
                </div>

                {Object.keys(rrppTotals).length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <SectionLabel>COMISIONES RRPP</SectionLabel>
                    {Object.entries(rrppTotals).map(([name, amt]) => (
                      <Row key={name} label={name} value={money(amt)} />
                    ))}
                  </div>
                )}

                <SectionLabel>CONFIGURACIÓN</SectionLabel>
                <Field label="Nombre del evento">
                  <input style={inputStyle} value={adminDraft.eventName} onChange={(e) => setAdminDraft((c) => ({ ...c, eventName: e.target.value }))} />
                </Field>
                <Field label="Bajada">
                  <input style={inputStyle} value={adminDraft.eventTagline} onChange={(e) => setAdminDraft((c) => ({ ...c, eventTagline: e.target.value }))} />
                </Field>
                <Field label="Fecha">
                  <input style={inputStyle} value={adminDraft.eventDate} onChange={(e) => setAdminDraft((c) => ({ ...c, eventDate: e.target.value }))} />
                </Field>
                <Field label="Lugar">
                  <input style={inputStyle} value={adminDraft.eventPlace} onChange={(e) => setAdminDraft((c) => ({ ...c, eventPlace: e.target.value }))} />
                </Field>
                <Field label="Precio general">
                  <input type="number" style={inputStyle} value={adminDraft.general} onChange={(e) => setAdminDraft((c) => ({ ...c, general: Number(e.target.value) }))} />
                </Field>
                <Field label="Precio VIP">
                  <input type="number" style={inputStyle} value={adminDraft.vip} onChange={(e) => setAdminDraft((c) => ({ ...c, vip: Number(e.target.value) }))} />
                </Field>
                <Field label="Cargo por servicio (%)">
                  <input type="number" style={inputStyle} value={adminDraft.feePercent} onChange={(e) => setAdminDraft((c) => ({ ...c, feePercent: Number(e.target.value) }))} />
                </Field>
                <Field label="Comisión por entrada con RRPP ($)">
                  <input type="number" style={inputStyle} value={adminDraft.rrppAmount} onChange={(e) => setAdminDraft((c) => ({ ...c, rrppAmount: Number(e.target.value) }))} />
                </Field>

                <PrimaryBtn onClick={saveAdminConfig} disabled={busy}>
                  {busy ? "Guardando..." : "Guardar cambios"}
                </PrimaryBtn>

                {sales.length > 0 && (
                  <div style={{ marginTop: 24 }}>
                    <SectionLabel>ÚLTIMAS VENTAS</SectionLabel>
                    {[...sales].reverse().slice(0, 15).map((s) => (
                      <div key={s.id} style={{ fontSize: 12, color: "#9a9aad", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                        <span style={{ color: "#fff" }}>{s.nombre} {s.apellido}</span> · {s.tier.toUpperCase()} × {s.qty} · {money(s.total)}
                        {s.rrpp ? ` · rrpp: ${s.rrpp}` : ""}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.03)",
  color: "#EDEDF4",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

function Field({ icon, label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#9a9aad", marginBottom: 6 }}>
        {icon}{label}
      </div>
      {children}
    </div>
  );
}

function PrimaryBtn({ children, onClick, disabled }) {
  return (
    <button
      className="jtv-btn"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "15px 0",
        borderRadius: 12,
        border: "none",
        background: disabled ? "#3a3a4a" : "linear-gradient(90deg, #FF2FA6, #FF6FCB)",
        color: "#fff",
        fontWeight: 700,
        fontSize: 15,
        cursor: disabled ? "default" : "pointer",
        boxShadow: disabled ? "none" : "0 6px 20px rgba(255,47,166,0.35)",
      }}
    >
      {children}
    </button>
  );
}

function BackBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{ background: "none", border: "none", color: "#6b6b7c", display: "flex", alignItems: "center", gap: 6, padding: 0, cursor: "pointer", fontSize: 13 }}>
      <ArrowLeft size={15} /> Volver
    </button>
  );
}

function StepBtn({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.03)", color: "#fff", fontSize: 18, cursor: "pointer" }}
    >
      {children}
    </button>
  );
}

function Row({ label, value, bold, muted }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: bold ? 16 : 13, color: muted ? "#6b6b7c" : "#EDEDF4", fontWeight: bold ? 700 : 400, padding: "4px 0" }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "12px 8px", textAlign: "center" }}>
      <div style={{ fontSize: 16, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 10, color: "#6b6b7c", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#6b6b7c", letterSpacing: 1, marginBottom: 10 }}>
      {children}
    </div>
  );
}
