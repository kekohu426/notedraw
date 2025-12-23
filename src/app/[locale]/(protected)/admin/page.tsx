import { Routes } from '@/routes';
import { redirect } from 'next/navigation';

/**
 * Admin root page - redirects to admin dashboard
 */
export default function AdminPage() {
  redirect(Routes.AdminDashboard);
}
