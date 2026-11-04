// client/src/themes/index.js
// Black Pearl Chat – design tokens per theme.
// "blackPearl" is now the premium light purple/white design (default).

export const THEMES = {
  blackPearl: {
    name: "Light (Default)",
    palette: {
      primary: "#8065F5",
      primarySoft: "#F5F6F8",
      border: "#ECECF1",
      textMain: "#242432",
      textLight: "#888895",
      surface: "#FFFFFF",
      surfaceAlt: "#FFFFFF",
      chatSelected: "#F0EBFF"
    },
    fonts: { ui: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif" }
  },
  midnight: {
    name: "Midnight (Dark)",
    palette: {
      primary: "#8065F5",
      primarySoft: "#0E1014",
      border: "#262A33",
      textMain: "#ECEEF2",
      textLight: "#8A909B",
      surface: "#1C1F26",
      surfaceAlt: "#16181D",
      chatSelected: "#2A2540"
    },
    fonts: { ui: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif" }
  }
};