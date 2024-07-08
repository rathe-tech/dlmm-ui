import { globalStyle, style } from "@vanilla-extract/css";

globalStyle("body", {
  backgroundColor: "black",
  color: "white",
});

export const position = style({
  border: "1px solid white",
  fontSize: "22px",
});