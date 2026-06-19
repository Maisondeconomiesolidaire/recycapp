import { Routes, Route, Navigate } from "react-router-dom";
import { PublicLayout } from "./components/public/PublicLayout";
import { Boutique } from "./pages/public/Boutique";
import { ArticleDetail } from "./pages/public/ArticleDetail";
import { CartPage } from "./pages/public/CartPage";
import { AerogommageForm } from "./pages/public/AerogommageForm";
import { CollecteForm } from "./pages/public/CollecteForm";
import { VeloForm } from "./pages/public/VeloForm";
import { Merci } from "./pages/public/Merci";
import { CrmLayout } from "./components/crm/CrmLayout";
import { Dashboard } from "./pages/crm/Dashboard";
import { Demandes } from "./pages/crm/Demandes";
import { Calendrier } from "./pages/crm/Calendrier";
import { Articles } from "./pages/crm/Articles";
import { Clients } from "./pages/crm/Clients";
import { Equipe } from "./pages/crm/Equipe";
import { Notifications } from "./pages/crm/Notifications";

export default function App() {
  return (
    <Routes>
      {/* Public (light mode) */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Navigate to="/boutique" replace />} />
        <Route path="/boutique" element={<Boutique />} />
        <Route path="/boutique/panier" element={<CartPage />} />
        <Route path="/boutique/categorie/:slug" element={<Boutique />} />
        <Route path="/boutique/:id" element={<ArticleDetail />} />
        <Route path="/aerogommage" element={<AerogommageForm />} />
        <Route path="/collecte" element={<CollecteForm />} />
        <Route path="/velo" element={<VeloForm />} />
        <Route path="/merci" element={<Merci />} />
      </Route>

      {/* CRM (dark mode, protégé Clerk) */}
      <Route path="/crm" element={<CrmLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="demandes" element={<Demandes />} />
        <Route path="calendrier" element={<Calendrier />} />
        <Route path="clients" element={<Clients />} />
        <Route path="articles" element={<Articles />} />
        <Route path="equipe" element={<Equipe />} />
      </Route>

      <Route path="*" element={<Navigate to="/boutique" replace />} />
    </Routes>
  );
}
