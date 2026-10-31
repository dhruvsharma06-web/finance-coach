// Copies samples/* into public/samples so the Import page's "Try a sample" buttons can fetch them.
import { cpSync, mkdirSync } from "fs";
mkdirSync("public/samples", { recursive: true });
cpSync("samples", "public/samples", { recursive: true });
