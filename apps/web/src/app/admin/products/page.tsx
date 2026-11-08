import Link from 'next/link';
import { AdminNotice, AdminPageHeader } from '@/components/admin';
import { buttonClasses, ExternalLinkIcon, ShoppingBagIcon, TagIcon } from '@/components/ui';

export default function AdminProductsPage() {
  return (
    <>
      <AdminPageHeader title="Products" description="Manage the products available in the Shopkart catalog." />
      <AdminNotice
        icon={ShoppingBagIcon}
        title="Product management is coming in the next phase"
        description={
          <>
            Creating, editing and publishing products from the admin console is being implemented in the next
            phase. Existing products remain live on the storefront, and categories can already be managed.
          </>
        }
        action={
          <>
            <Link href="/admin/categories" className={buttonClasses({ size: 'sm', className: 'h-10' })}>
              <TagIcon className="h-4 w-4" />
              Manage categories
            </Link>
            <Link href="/products" className={buttonClasses({ variant: 'secondary', size: 'sm', className: 'h-10' })}>
              <ExternalLinkIcon className="h-4 w-4" />
              View live catalog
            </Link>
          </>
        }
      />
    </>
  );
}
