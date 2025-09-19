// Luxe theme registry – palette now uses the accent color from the image
export const THEMES = {
  /* 01 – Black Pearl */
  blackPearl: {
    name: "Black Pearl",
    palette: {
      primary:     "#091C2A", // dark navy bg
      primarySoft: "#112436",
      border:      "#1A3345",
      /* accent (Rose Fog) text */
      textMain:    "#E1C2B3", // ◎ high-contrast pinkish
      textLight:   "#B8A7A0"
    },
    fonts: { ui: "'Cinzel', serif" }
  },

  /* 02 – Rose Fog */
  roseFog: {
    name: "Rose Fog",
    palette: {
      primary:     "#E1C2B3", // rosy bg
      primarySoft: "#EBD7CE",
      border:      "#D3B1A1",
      textMain:    "#091C2A", // ◎ navy title
      textLight:   "#463F3B"
    },
    fonts: { ui: "'Playfair Display', serif" }
  },

  /* 03 – Jungle Green */
  jungleGreen: {
    name: "Jungle Green",
    palette: {
      primary:     "#233326",
      primarySoft: "#293C2E",
      border:      "#365040",
      textMain:    "#E8D0A7", // ◎ Hampton accent
      textLight:   "#CFC6AC"
    },
    fonts: { ui: "'Cormorant Garamond', serif" }
  },

  /* 04 – Hampton */
  hampton: {
    name: "Hampton",
    palette: {
      primary:     "#E8D0A7",
      primarySoft: "#ECD9B9",
      border:      "#CDBE9E",
      textMain:    "#233326", // ◎ Jungle Green ink
      textLight:   "#4B4B3F"
    },
    fonts: { ui: "'Lora', serif" }
  },

  /* 05 – Wine Berry */
  wineBerry: {
    name: "Wine Berry",
    palette: {
      primary:     "#58242A",
      primarySoft: "#632E32",
      border:      "#70373B",
      textMain:    "#E8D0A7", // ◎ Hampton accent
      textLight:   "#CCB6A4"
    },
    fonts: { ui: "'Merriweather', serif" }
  },

  /* 06 – Timberwolf */
  timberwolf: {
    name: "Timberwolf",
    palette: {
      primary:     "#E2D6C9",
      primarySoft: "#EBE0D5",
      border:      "#CFC5BA",
      textMain:    "#58242A", // ◎ Wine Berry ink
      textLight:   "#624448"
    },
    fonts: { ui: "'Bodoni Moda', serif" }
  },

  /* 07 – Walnut */
  walnut: {
    name: "Walnut",
    palette: {
      primary:     "#3A2E29",
      primarySoft: "#443531",
      border:      "#503C38",
      textMain:    "#E1C2B3", // ◎ Rose Fog accent
      textLight:   "#C5B0A4"
    },
    fonts: { ui: "'Crimson Text', serif" }
  },

  /* 08 – Pale Taupe */
  paleTaupe: {
    name: "Pale Taupe",
    palette: {
      primary:     "#BE9C83",
      primarySoft: "#C7A68F",
      border:      "#AF9782",
      textMain:    "#3A2E29", // ◎ Walnut ink
      textLight:   "#5A4A42"
    },
    fonts: { ui: "'EB Garamond', serif" }
  }
};
