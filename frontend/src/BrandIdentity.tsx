import { PreoraIcon } from "./BrandLogo";
import type { ReactNode } from "react";

// PREORA Brand Identity Presentation Page


function Wordmark({ preColor = "#0f172a", size = 28 }: { preColor?: string; size?: number }) {
  const base = {
    fontFamily: "Fraunces, serif",
    fontSize: size,
    fontWeight: 700,
    letterSpacing: "-0.04em",
    lineHeight: 1,
  };
  return (
    <span style={{ ...base, color: preColor }}>
      PRE<span style={{ color: "#0d9488" }}>ORA</span>
    </span>
  );
}

function LogoLockup({
  iconSize = 48,
  preColor = "#0f172a",
  wordmarkSize = 26,
  vertical = false,
}: {
  iconSize?: number;
  preColor?: string;
  wordmarkSize?: number;
  vertical?: boolean;
}) {
  return vertical ? (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
      <PreoraIcon size={iconSize} />
      <Wordmark preColor={preColor} size={wordmarkSize} />
    </div>
  ) : (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <PreoraIcon size={iconSize} />
      <Wordmark preColor={preColor} size={wordmarkSize} />
    </div>
  );
}

// ── Swatch ─────────────────────────────────────────────────────────────────

function Swatch({
  hex,
  name,
  role,
  textColor = "#fff",
  border,
}: {
  hex: string;
  name: string;
  role: string;
  textColor?: string;
  border?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          width: "100%",
          height: 120,
          borderRadius: 16,
          background: hex,
          border: border ?? "none",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "14px 16px",
        }}
      >
        <span
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 12,
            fontWeight: 500,
            color: textColor,
            opacity: 0.75,
            letterSpacing: "0.04em",
          }}
        >
          {hex.toUpperCase()}
        </span>
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, color: "#0f172a", marginBottom: 2 }}>{name}</div>
        <div style={{ fontSize: 12, color: "#64748b" }}>{role}</div>
      </div>
    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────

function Section({ children, bg = "#fff", label }: { children: ReactNode; bg?: string; label?: string }) {
  return (
    <section
      style={{
        background: bg,
        padding: "80px 0",
        position: "relative",
      }}
    >
      {label && (
        <div
          style={{
            position: "absolute",
            top: 32,
            right: 40,
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 10,
            letterSpacing: "0.14em",
            color: "#94a3b8",
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
      )}
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 40px" }}>{children}</div>
    </section>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: "Fraunces, serif",
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "#0d9488",
        marginBottom: 40,
      }}
    >
      {children}
    </h2>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "#e2e8f0", margin: "0" }} />;
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function BrandIdentity() {
  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
      {/* Back link */}
      <div
        style={{
          position: "fixed",
          top: 24,
          left: 32,
          zIndex: 50,
        }}
      >
        <a
          href="#"
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 13,
            fontWeight: 500,
            color: "#64748b",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: 8,
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(8px)",
            border: "1px solid #e2e8f0",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#0d9488")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#64748b")}
        >
          ← Trang chủ
        </a>
      </div>

      {/* ── Cover ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          background: "linear-gradient(160deg, #0f172a 0%, #0a1f1e 55%, #071a28 100%)",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "120px 40px 80px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle grid texture */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(13,148,136,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(13,148,136,0.05) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            pointerEvents: "none",
          }}
        />
        {/* Teal glow */}
        <div
          style={{
            position: "absolute",
            top: "30%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 480,
            height: 480,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(13,148,136,0.12) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", textAlign: "center" }}>
          <div
            style={{
              display: "inline-block",
              padding: "6px 16px",
              borderRadius: 100,
              border: "1px solid rgba(13,148,136,0.35)",
              background: "rgba(13,148,136,0.08)",
              marginBottom: 48,
            }}
          >
            <span
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 11,
                letterSpacing: "0.18em",
                color: "#2dd4bf",
                textTransform: "uppercase",
              }}
            >
              Hệ Thống Nhận Diện Thương Hiệu
            </span>
          </div>

          {/* Vertical lockup — icon above, wordmark below */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
            <LogoLockup iconSize={140} preColor="#f0f6ff" wordmarkSize={72} vertical />
          </div>
          <p
            style={{
              fontSize: 18,
              color: "#94a3b8",
              maxWidth: 440,
              margin: "0 auto",
              lineHeight: 1.6,
            }}
          >
            Tài liệu nhận diện thương hiệu
          </p>

          <div
            style={{
              marginTop: 64,
              display: "flex",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {["Hệ Logo", "Bảng Màu", "Kiểu Chữ", "Ý Nghĩa Thương Hiệu"].map((s) => (
              <span
                key={s}
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  color: "#475569",
                  padding: "4px 10px",
                  borderRadius: 4,
                  border: "1px solid #1e293b",
                  textTransform: "uppercase",
                }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      <Divider />

      {/* ── 01 — Primary Logo ─────────────────────────────────────────────── */}
      <Section bg="#fff" label="01 / Hệ Logo">
        <SectionHeading>Logo Chính</SectionHeading>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
          }}
        >
          {/* Dark bg version */}
          <div
            style={{
              borderRadius: 20,
              background: "#0f172a",
              padding: "56px 40px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 32,
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 16,
                left: 20,
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 9,
                letterSpacing: "0.14em",
                color: "#334155",
                textTransform: "uppercase",
              }}
            >
              Nền Tối
            </div>
            <LogoLockup iconSize={56} preColor="#f0f6ff" wordmarkSize={30} />
            <div style={{ height: 1, background: "#1e293b", width: "100%" }} />
            <LogoLockup iconSize={40} preColor="#f0f6ff" wordmarkSize={22} />
          </div>

          {/* Light bg version */}
          <div
            style={{
              borderRadius: 20,
              background: "#f8fafc",
              border: "1.5px solid #e2e8f0",
              padding: "56px 40px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 32,
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 16,
                left: 20,
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 9,
                letterSpacing: "0.14em",
                color: "#94a3b8",
                textTransform: "uppercase",
              }}
            >
              Nền Sáng
            </div>
            <LogoLockup iconSize={56} preColor="#0f172a" wordmarkSize={30} />
            <div style={{ height: 1, background: "#e2e8f0", width: "100%" }} />
            <LogoLockup iconSize={40} preColor="#0f172a" wordmarkSize={22} />
          </div>
        </div>

        {/* Teal bg version */}
        <div
          style={{
            marginTop: 24,
            borderRadius: 20,
            background: "#0d9488",
            padding: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 16,
              left: 20,
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 9,
              letterSpacing: "0.14em",
              color: "rgba(255,255,255,0.5)",
              textTransform: "uppercase",
            }}
          >
            Nền Teal Thương Hiệu
          </div>
          <LogoLockup iconSize={52} preColor="#f0f6ff" wordmarkSize={28} />
        </div>

        {/* Vertical lockup */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 24 }}>
          <div
            style={{
              borderRadius: 20,
              background: "#0f172a",
              padding: "56px 40px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <div style={{ position: "absolute", top: 16, left: 20, fontFamily: "JetBrains Mono, monospace", fontSize: 9, letterSpacing: "0.14em", color: "#334155", textTransform: "uppercase" }}>
              Dọc — Nền Tối
            </div>
            <LogoLockup iconSize={88} preColor="#f0f6ff" wordmarkSize={44} vertical />
          </div>
          <div
            style={{
              borderRadius: 20,
              background: "#f8fafc",
              border: "1.5px solid #e2e8f0",
              padding: "56px 40px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <div style={{ position: "absolute", top: 16, left: 20, fontFamily: "JetBrains Mono, monospace", fontSize: 9, letterSpacing: "0.14em", color: "#94a3b8", textTransform: "uppercase" }}>
              Dọc — Nền Sáng
            </div>
            <LogoLockup iconSize={88} preColor="#0f172a" wordmarkSize={44} vertical />
          </div>
        </div>
      </Section>

      <Divider />

      {/* ── 02 — App Icon ─────────────────────────────────────────────────── */}
      <Section bg="#f8fafc" label="02 / App Icon">
        <SectionHeading>Hệ Icon Ứng Dụng</SectionHeading>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
          {[120, 88, 64, 48].map((sz) => (
            <div
              key={sz}
              style={{
                borderRadius: 16,
                background: "#fff",
                border: "1.5px solid #e2e8f0",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
                padding: 32,
              }}
            >
              <PreoraIcon size={sz} />
              <span
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 11,
                  color: "#94a3b8",
                  letterSpacing: "0.06em",
                }}
              >
                {sz}×{sz}
              </span>
            </div>
          ))}
        </div>

        {/* Icon anatomy */}
        <div
          style={{
            marginTop: 24,
            borderRadius: 20,
            background: "#fff",
            border: "1.5px solid #e2e8f0",
            padding: "48px 40px",
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: 64,
            alignItems: "center",
          }}
        >
          <div style={{ position: "relative" }}>
            <PreoraIcon size={160} />
          </div>
          <div>
            <h3
              style={{
                fontFamily: "Fraunces, serif",
                fontSize: 22,
                fontWeight: 600,
                color: "#0f172a",
                letterSpacing: "-0.02em",
                marginBottom: 20,
              }}
            >
              Giải phẫu Icon
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { dot: "#f0f6ff", label: "Thân chữ P", desc: "Chữ P — nền tảng của thương hiệu" },
                { dot: "#14b8a6", label: "Vòm + Quai túi", desc: "Cung vòm của túi mua sắm bao quanh chữ P" },
                { dot: "#0d9488", label: "Thân túi", desc: "Khung thương mại — màu teal chủ đạo" },
                { dot: "#5eead4", label: "Đồng hồ", desc: "Đếm ngược pre-order — thể hiện sự cấp bách" },
                { dot: "#5eead4", label: "Điểm tín hiệu AI", desc: "Tín hiệu dữ liệu AI trực tiếp bên trong chữ P" },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: item.dot,
                      border: "1.5px solid #e2e8f0",
                      marginTop: 4,
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 13, color: "#0f172a" }}>{item.label}</span>
                    <span style={{ fontSize: 13, color: "#64748b" }}> — {item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Divider />

      {/* ── 03 — Color Palette ────────────────────────────────────────────── */}
      <Section bg="#fff" label="03 / Bảng Màu">
        <SectionHeading>Bảng Màu Thương Hiệu</SectionHeading>

        {/* Primary */}
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10,
              letterSpacing: "0.12em",
              color: "#94a3b8",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            Màu Chính
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            <Swatch hex="#0f172a" name="Navy" role="Nền thương hiệu, văn bản, mặt tối" textColor="#94a3b8" />
            <Swatch hex="#0d9488" name="Teal 600" role="Màu thương hiệu chính, nút CTA, trạng thái active" />
            <Swatch hex="#14b8a6" name="Teal 500" role="Vòm logo, điểm nhấn tương tác" />
          </div>
        </div>

        {/* Secondary */}
        <div style={{ marginTop: 32, marginBottom: 12 }}>
          <div
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10,
              letterSpacing: "0.12em",
              color: "#94a3b8",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            Màu Hỗ Trợ
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            <Swatch hex="#2dd4bf" name="Teal 400" role="Viền túi, điểm nhấn nhẹ" />
            <Swatch hex="#5eead4" name="Teal 300" role="Tín hiệu AI, đồng hồ, điểm accent" />
            <Swatch hex="#f97316" name="Cam San Hô" role="Khẩn cấp, deadline, nhãn giảm giá" />
            <Swatch hex="#7c3aed" name="Tím" role="Chỉ dùng cho số liệu dự đoán AI" />
          </div>
        </div>

        {/* Neutral */}
        <div style={{ marginTop: 32 }}>
          <div
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10,
              letterSpacing: "0.12em",
              color: "#94a3b8",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            Màu Trung Tính
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
            <Swatch hex="#f0f6ff" name="Trắng Băng" role="Thân chữ icon, chữ sáng trên nền tối" textColor="#94a3b8" border="1.5px solid #e2e8f0" />
            <Swatch hex="#f8fafc" name="Nền Trang" role="Nền trang, mặt phẳng sáng" textColor="#94a3b8" border="1.5px solid #e2e8f0" />
            <Swatch hex="#e2e8f0" name="Đường Viền" role="Đường kẻ mỏng, viền card" textColor="#64748b" />
            <Swatch hex="#64748b" name="Phụ" role="Văn bản phụ, chú thích" />
            <Swatch hex="#0a1018" name="Đen Sâu" role="Tối nhất, nền icon" textColor="#475569" />
          </div>
        </div>
      </Section>

      <Divider />

      {/* ── 04 — Typography ───────────────────────────────────────────────── */}
      <Section bg="#f8fafc" label="04 / Kiểu Chữ">
        <SectionHeading>Hệ Thống Kiểu Chữ</SectionHeading>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
          {/* Fraunces */}
          <div
            style={{
              borderRadius: 16,
              background: "#fff",
              border: "1.5px solid #e2e8f0",
              padding: "36px 32px",
            }}
          >
            <div
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 9,
                letterSpacing: "0.14em",
                color: "#94a3b8",
                textTransform: "uppercase",
                marginBottom: 20,
              }}
            >
              Tiêu Đề / Hiển Thị
            </div>
            <div
              style={{
                fontFamily: "Fraunces, serif",
                fontSize: 42,
                fontWeight: 700,
                color: "#0f172a",
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
                marginBottom: 20,
              }}
            >
              Fraunces
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { weight: "700", sample: "Aa", label: "Bold — Tiêu đề lớn" },
                { weight: "600", sample: "Aa", label: "SemiBold — Tiêu đề phụ" },
                { weight: "400", sample: "Aa", label: "Regular — Văn bản hiển thị" },
              ].map((r) => (
                <div key={r.weight} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    style={{
                      fontFamily: "Fraunces, serif",
                      fontSize: 18,
                      fontWeight: parseInt(r.weight),
                      color: "#0f172a",
                      width: 32,
                    }}
                  >
                    {r.sample}
                  </span>
                  <span style={{ fontSize: 11, color: "#64748b" }}>{r.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Inter */}
          <div
            style={{
              borderRadius: 16,
              background: "#fff",
              border: "1.5px solid #e2e8f0",
              padding: "36px 32px",
            }}
          >
            <div
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 9,
                letterSpacing: "0.14em",
                color: "#94a3b8",
                textTransform: "uppercase",
                marginBottom: 20,
              }}
            >
              Nội Dung / Giao Diện
            </div>
            <div
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 42,
                fontWeight: 700,
                color: "#0f172a",
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
                marginBottom: 20,
              }}
            >
              Inter
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { weight: "700", sample: "Aa", label: "Bold — Nhãn giao diện" },
                { weight: "600", sample: "Aa", label: "SemiBold — Nút, điều hướng" },
                { weight: "400", sample: "Aa", label: "Regular — Văn bản thân bài" },
              ].map((r) => (
                <div key={r.weight} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 18,
                      fontWeight: parseInt(r.weight),
                      color: "#0f172a",
                      width: 32,
                    }}
                  >
                    {r.sample}
                  </span>
                  <span style={{ fontSize: 11, color: "#64748b" }}>{r.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* JetBrains Mono */}
          <div
            style={{
              borderRadius: 16,
              background: "#fff",
              border: "1.5px solid #e2e8f0",
              padding: "36px 32px",
            }}
          >
            <div
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 9,
                letterSpacing: "0.14em",
                color: "#94a3b8",
                textTransform: "uppercase",
                marginBottom: 20,
              }}
            >
              Mono / Dữ Liệu
            </div>
            <div
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 36,
                fontWeight: 700,
                color: "#0f172a",
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
                marginBottom: 20,
              }}
            >
              JetBrains
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { weight: "600", sample: "01", label: "Medium — Số liệu dữ liệu" },
                { weight: "500", sample: "01", label: "Regular — Mã màu hex" },
                { weight: "400", sample: "01", label: "Light — Nhãn section" },
              ].map((r) => (
                <div key={r.weight} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    style={{
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: 16,
                      fontWeight: parseInt(r.weight),
                      color: "#0d9488",
                      width: 32,
                    }}
                  >
                    {r.sample}
                  </span>
                  <span style={{ fontSize: 11, color: "#64748b" }}>{r.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Type scale sample */}
        <div
          style={{
            marginTop: 24,
            borderRadius: 16,
            background: "#fff",
            border: "1.5px solid #e2e8f0",
            padding: "36px 40px",
          }}
        >
          <div
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 9,
              letterSpacing: "0.14em",
              color: "#94a3b8",
              textTransform: "uppercase",
              marginBottom: 24,
            }}
          >
            Bộ chữ trong ngữ cảnh thực tế
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 56, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.04em", lineHeight: 1 }}>
              Xây dựng điều mà người ta thực sự muốn.
            </div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 28, fontWeight: 600, color: "#0f172a", letterSpacing: "-0.02em" }}>
              Thương mại pre-order được hỗ trợ bởi AI
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#475569", lineHeight: 1.7, maxWidth: 600 }}>
              Preora giúp các nhà sáng tạo và doanh nghiệp ra mắt sản phẩm trước khi sản xuất đại trà, thu thập nhu cầu thực từ khách hàng, và sử dụng AI để đưa ra quyết định sản xuất thông minh hơn.
            </div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "#0d9488", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              438 Đơn đặt trước · 73% mục tiêu · Còn 8 ngày
            </div>
          </div>
        </div>
      </Section>

      <Divider />

      {/* ── 05 — Brand Meaning ────────────────────────────────────────────── */}
      <Section bg="#fff" label="05 / Ý Nghĩa Thương Hiệu">
        <SectionHeading>Ý Nghĩa Thương Hiệu</SectionHeading>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
          <div>
            <h3
              style={{
                fontFamily: "Fraunces, serif",
                fontSize: 38,
                fontWeight: 700,
                color: "#0f172a",
                letterSpacing: "-0.03em",
                lineHeight: 1.15,
                marginBottom: 24,
              }}
            >
              PREORA
              <br />
              có nghĩa là gì?
            </h3>
            <p style={{ fontSize: 15, color: "#475569", lineHeight: 1.75, marginBottom: 20 }}>
              <strong style={{ color: "#0f172a" }}>PREORA</strong> là nền tảng thương mại pre-order được hỗ trợ bởi AI, được xây dựng cho các nhà sáng tạo và doanh nghiệp muốn kiểm chứng nhu cầu trước khi sản xuất — loại bỏ rủi ro tồn kho và sự đoán mò.
            </p>
            <p style={{ fontSize: 15, color: "#475569", lineHeight: 1.75 }}>
              Tên thương hiệu kết hợp <strong style={{ color: "#0f172a" }}>PRE</strong> (đặt trước, tiên phong) với <strong style={{ color: "#0f172a" }}>ORA</strong> — gợi lên nghĩa Latin của tiếng nói, phát ngôn và tín hiệu. Cùng nhau: <em>tiếng nói của nhu cầu trước khi nó xảy ra.</em>
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              {
                icon: "P",
                color: "#0d9488",
                title: "Chữ P",
                desc: "Một chữ P đậm, chuẩn xác về mặt quang học làm trung tâm — đại diện cho PRE, thương mại tiên phong và sự chuẩn bị.",
              },
              {
                icon: "⌚",
                color: "#5eead4",
                title: "Đồng Hồ Pre-order",
                desc: "Mặt đồng hồ tối giản nằm trong ngăn phải của túi, tượng trưng cho tính thời hạn của chiến dịch và đếm ngược đến sản xuất.",
              },
              {
                icon: "◎",
                color: "#7c3aed",
                title: "Điểm Tín Hiệu AI",
                desc: "Điểm teal accent bên trong chữ P đại diện cho tín hiệu dữ liệu trực tiếp — AI đang đọc nhu cầu theo thời gian thực.",
              },
              {
                icon: "🛍",
                color: "#0f172a",
                title: "Túi Mua Sắm",
                desc: "Túi bao quanh chữ P, đặt thương mại làm trung tâm. Quai vòm đóng khung toàn bộ biểu tượng, kết hợp thương hiệu và sản phẩm.",
              },
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  borderRadius: 14,
                  border: "1.5px solid #e2e8f0",
                  padding: "20px 24px",
                  display: "flex",
                  gap: 16,
                  alignItems: "flex-start",
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#99f6e4")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#e2e8f0")}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: item.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    color: "#fff",
                    fontFamily: "Fraunces, serif",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#0f172a", marginBottom: 4 }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Divider />

      {/* ── 06 — Usage Guidelines ─────────────────────────────────────────── */}
      <Section bg="#f8fafc" label="06 / Hướng Dẫn Sử Dụng">
        <SectionHeading>Hướng Dẫn Sử Dụng Logo</SectionHeading>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* Do */}
          <div
            style={{
              borderRadius: 16,
              background: "#fff",
              border: "1.5px solid #e2e8f0",
              padding: "32px",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 24,
                padding: "4px 12px",
                borderRadius: 100,
                background: "#f0fdf9",
                border: "1px solid #99f6e4",
              }}
            >
              <span style={{ color: "#0d9488", fontWeight: 700, fontSize: 13 }}>✓</span>
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, letterSpacing: "0.12em", color: "#0d9488", textTransform: "uppercase" }}>
                Nên làm
              </span>
            </div>
            <ul style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                "Dùng bộ lockup đầy đủ (icon + wordmark) làm logo chính",
                "Đặt logo trên nền navy, teal hoặc trắng mà thôi",
                "Giữ khoảng trống tối thiểu bằng chiều cao icon ở tất cả các cạnh",
                "Dùng Fraunces Bold cho wordmark ở mọi kích thước",
                "Giữ nguyên đồng hồ và điểm teal accent trong icon",
              ].map((item) => (
                <li key={item} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ color: "#0d9488", fontWeight: 700, flexShrink: 0 }}>·</span>
                  <span style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Don't */}
          <div
            style={{
              borderRadius: 16,
              background: "#fff",
              border: "1.5px solid #e2e8f0",
              padding: "32px",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 24,
                padding: "4px 12px",
                borderRadius: 100,
                background: "#fff5f5",
                border: "1px solid #fca5a5",
              }}
            >
              <span style={{ color: "#ef4444", fontWeight: 700, fontSize: 13 }}>✗</span>
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, letterSpacing: "0.12em", color: "#ef4444", textTransform: "uppercase" }}>
                Không nên
              </span>
            </div>
            <ul style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                "Không đổi màu icon hoặc wordmark bằng màu ngoài bộ màu thương hiệu",
                "Không kéo dài, xoay hoặc biến dạng bất kỳ thành phần logo nào",
                "Không đặt logo lên ảnh chụp phức tạp mà không có lớp phủ",
                "Không dùng cam san hô hay tím làm màu logo",
                "Không xóa đồng hồ hoặc điểm accent khỏi icon",
              ].map((item) => (
                <li key={item} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ color: "#ef4444", fontWeight: 700, flexShrink: 0 }}>·</span>
                  <span style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Divider />

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          background: "#0f172a",
          padding: "48px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 24,
        }}
      >
        <LogoLockup iconSize={36} preColor="#f0f6ff" wordmarkSize={20} />
        <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
          <span
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10,
              letterSpacing: "0.12em",
              color: "#334155",
              textTransform: "uppercase",
            }}
          >
            Nhận Diện Thương Hiệu v1.0
          </span>
          <span
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10,
              letterSpacing: "0.12em",
              color: "#334155",
              textTransform: "uppercase",
            }}
          >
            © 2026 Preora
          </span>
        </div>
      </div>
    </div>
  );
}
