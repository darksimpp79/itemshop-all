import os
import re

ADMIN_FILE = "app/admin/page.tsx"
SHOP_FILE = "app/admin/shop/[shopId]/page.tsx"

# 1. REFACTOR SHOP FILE
with open(SHOP_FILE, "r") as f:
    shop_content = f.read()

# Replace AdminPanel definition with ShopPanel wrapper
# It currently has: export default function AdminPanel() {
shop_content = shop_content.replace(
    'export default function AdminPanel() {',
    'import { use } from "react";\n\nexport default function ShopPage({ params }: { params: Promise<{ shopId: string }> }) {\n  const resolvedParams = use(params);\n  const initialShopId = parseInt(resolvedParams.shopId);\n  return <ShopPanel initialShopId={initialShopId} />;\n}\n\nfunction ShopPanel({ initialShopId }: { initialShopId: number }) {'
)

# Replace activeShopId state initialization
shop_content = shop_content.replace(
    'const [activeShopId, setActiveShopId] = useState<number | null>(null);',
    'const [activeShopId, setActiveShopId] = useState<number | null>(initialShopId);'
)

# We want to remove the "My Account" header parts from SHOP_FILE
# and replace the Sidebar.
# Wait, this is getting complex for a simple script. 
# Let's do this step-by-step.
with open(SHOP_FILE, "w") as f:
    f.write(shop_content)
