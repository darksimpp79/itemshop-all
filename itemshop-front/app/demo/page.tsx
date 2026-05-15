import { redirect } from "next/navigation";

// demo.pumpking.club obsługuje pełne demo z prawdziwymi komponentami,
// zasilane przez mock API w app/api/storefront/demo/*.
export default function DemoPage() {
  redirect("https://demo.pumpking.club");
}
