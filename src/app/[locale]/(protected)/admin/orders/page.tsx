import { PaymentsPageClient } from '@/components/admin/payments-page-client';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Dashboard.admin.orders' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default function OrdersPage() {
  return (
    <div className="px-4 lg:px-6">
      <PaymentsPageClient />
    </div>
  );
}
