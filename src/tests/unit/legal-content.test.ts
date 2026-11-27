import { describe, expect, it } from "vitest";
import {
  LEGAL_DOCUMENTS,
  parseLegalContent,
  resolveLegalContent,
  serializeLegalContent
} from "@/domain/legal/legal-documents";

describe("legal document content", () => {
  const operator = {
    clinicName: "Сияние",
    legalName: "ООО «Сияние Клиник»",
    taxId: "0000000000",
    address: "Чита, ул. Суглинная, 2Б",
    phone: "+7 (999) 000-00-00",
    email: "hello@siyanie.test"
  };

  it("round-trips structured content and replaces operator tokens", () => {
    const source = LEGAL_DOCUMENTS[0].content;
    const parsed = parseLegalContent(serializeLegalContent(source));
    expect(parsed).toEqual(source);

    const resolved = resolveLegalContent(serializeLegalContent(source), operator);
    expect(resolved?.lead).toContain("Сияние");
    expect(JSON.stringify(resolved)).toContain("ООО «Сияние Клиник»");
    expect(JSON.stringify(resolved)).not.toContain("{{");
  });

  it("keeps legacy plain-text legal documents readable", () => {
    expect(parseLegalContent("Старая версия документа")).toBeNull();
  });
});
