import { describe, expect, it } from "vitest";
import { estimateYears, heuristicParse } from "@/lib/cv/heuristic";
import { extractText, sniffType } from "@/lib/cv/extract";
import { decryptBuffer, encryptBuffer } from "@/lib/crypto";
import { readFileSync } from "node:fs";

const CV = `Max Mustermann
max.mustermann@example.com · +49 170 1234567
Berufserfahrung
03/2020 – heute  Full-Stack Developer, Example GmbH
Entwicklung mit TypeScript, React und PostgreSQL, Docker
2016 - 2019 IT Support, Other AG
Ausbildung
2012 - 2016 B.Sc. Informatik
Sprachen
Deutsch – Muttersprache
Englisch C1`;

describe("heuristic CV parser", () => {
  const p = heuristicParse(CV);
  it("extracts contact data and name", () => {
    expect(p.fullName).toBe("Max Mustermann");
    expect(p.email).toBe("max.mustermann@example.com");
    expect(p.phone).toContain("170");
  });
  it("extracts skills and languages", () => {
    expect(p.skills).toEqual(expect.arrayContaining(["TypeScript", "React", "PostgreSQL", "Docker", "IT Support"]));
    expect(p.languages.map((l) => l.name)).toEqual(expect.arrayContaining(["German", "English"]));
    expect(p.languages.find((l) => l.name === "English")?.level).toBe("C1");
  });
  it("estimates years without counting education", () => {
    expect(estimateYears("2016 - 2019 x\n2020 – heute y", new Date("2026-10-30"))).toBe(9);
  });
  it("never invents experience entries", () => expect(p.experience).toEqual([]));
});

describe("file handling", () => {
  it("rejects non-PDF/DOCX by magic bytes", async () => {
    expect(sniffType(Buffer.from("GIF89a"))).toBeNull();
    await expect(extractText(Buffer.from("hello"))).rejects.toThrow(/PDF or DOCX/);
  });
  it("extracts text from a real PDF", async () => {
    const { text, kind } = await extractText(readFileSync("tests/fixtures/sample-cv.pdf"));
    expect(kind).toBe("pdf");
    expect(text).toContain("TypeScript");
  });
  it("extracts text from a real DOCX", async () => {
    const { text, kind } = await extractText(readFileSync("tests/fixtures/sample-cv.docx"));
    expect(kind).toBe("docx");
    expect(text).toContain("PostgreSQL");
  });
  it("encrypts with AES-GCM and detects tampering", () => {
    const key = Buffer.alloc(32, 1).toString("base64");
    const enc = encryptBuffer(Buffer.from("secret cv"), key);
    expect(decryptBuffer(enc, key).toString()).toBe("secret cv");
    enc[enc.length - 1]! ^= 1;
    expect(() => decryptBuffer(enc, key)).toThrow();
  });
});
