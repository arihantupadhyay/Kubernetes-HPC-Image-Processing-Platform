
function Footer() {
  const styles = {
    footer: {
      marginTop: "30px",
      width: "100%",
      flexBasis: "100%",
      boxSizing: "border-box",
      background: "#111827",
      borderTop: "1px solid #263247",
      padding: "30px 40px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: "25px",
      color: "#ffffff",
      fontFamily: "Arial, sans-serif",
    },
    brand: {
      fontSize: "24px",
      fontWeight: "800",
      margin: "0 0 8px",
    },
    blue: {
      color: "#38bdf8",
    },
    description: {
      color: "#94a3b8",
      fontSize: "12px",
      margin: 0,
    },
    center: {
      textAlign: "center",
    },
    label: {
      color: "#94a3b8",
      fontSize: "11px",
      letterSpacing: "1.5px",
      textTransform: "uppercase",
      margin: "0 0 9px",
    },
    names: {
      fontSize: "19px",
      fontWeight: "700",
      margin: 0,
    },
    right: {
      textAlign: "right",
    },
    status: {
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: "8px",
      color: "#cbd5e1",
      fontSize: "12px",
      marginBottom: "10px",
    },
    dot: {
      width: "8px",
      height: "8px",
      borderRadius: "50%",
      background: "#22c55e",
      display: "inline-block",
    },
    copyright: {
      color: "#94a3b8",
      fontSize: "12px",
      margin: 0,
    },
  };

  return (
    <footer style={styles.footer}>
      <div>
        <h2 style={styles.brand}>
          HPC<span style={styles.blue}>Cloud</span>
        </h2>
        <p style={styles.description}>
          Distributed High Performance Computing Platform
        </p>
      </div>

      <div style={styles.center}>
        <p style={styles.label}>Designed & Developed By</p>
        <h3 style={styles.names}>
          Arihant <span style={styles.blue}>&</span> Rishit
        </h3>
      </div>

      <div style={styles.right}>
        <div style={styles.status}>
          <span style={styles.dot}></span>
          Kubernetes Cluster Connected
        </div>
        <p style={styles.copyright}>
          © 2026 HPCCloud. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
