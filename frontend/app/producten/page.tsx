import type { Metadata } from "next";
import ProductenClient from "./ProductenClient";

export const metadata: Metadata = {
  title: "Onze producten",
  description:
    "VorzaIQ maakt slimme AI-tools voor werving en werk: VorzaIQ, LisaRecruit en VorzaPDF. Elk product heeft een eigen doel en een eigen website.",
  alternates: { canonical: "https://www.vorzaiq.com/producten" },
};

export default function ProductenPage() {
  return <ProductenClient />;
}
