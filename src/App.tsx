import { Routes, Route, Navigate } from "react-router-dom";
import { PublicLayout } from "./components/public/PublicLayout";
import { Boutique } from "./pages/public/Boutique";
import { ArticleDetail } from "./pages/public/ArticleDetail";
import { CartPage } from "./pages/public/CartPage";
import { Favoris } from "./pages/public/Favoris";
import { TourneeTracking } from "./pages/public/TourneeTracking";
import { AerogommageForm } from "./pages/public/AerogommageForm";
import { CollecteForm } from "./pages/public/CollecteForm";
import { VeloForm } from "./pages/public/VeloForm";
import { Merci } from "./pages/public/Merci";
import {
  AccountLayout,
  AccountInfo,
  AccountOrders,
  AccountOrderDetail,
  AccountMessages,
  AccountSettings,
} from "./pages/public/Account";
import { CrmLayout } from "./components/crm/CrmLayout";
import { RequireCrmPermission } from "./components/crm/RequireCrmPermission";
import { Dashboard } from "./pages/crm/Dashboard";
import { Demandes } from "./pages/crm/Demandes";
import { Calendrier } from "./pages/crm/Calendrier";
import { Articles } from "./pages/crm/Articles";
import { Clients } from "./pages/crm/Clients";
import { Equipe } from "./pages/crm/Equipe";
import { Notifications } from "./pages/crm/Notifications";
import { Arrivages } from "./pages/crm/Arrivages";
import { Caisse } from "./pages/crm/Caisse";
import { Ateliers } from "./pages/crm/Ateliers";
import { Sorties } from "./pages/crm/Sorties";
import { Tournees } from "./pages/crm/Tournees";
import { TourneeConduite } from "./pages/crm/TourneeConduite";
import { Messages } from "./pages/crm/Messages";
import { Documents } from "./pages/crm/Documents";
import { Admin } from "./pages/crm/Admin";

export default function App() {
  return (
    <Routes>
      {/* Public (light mode) */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Navigate to="/boutique" replace />} />
        <Route path="/boutique" element={<Boutique />} />
        <Route path="/boutique/panier" element={<CartPage />} />
        <Route path="/favoris" element={<Favoris />} />
        <Route path="/suivi/:token" element={<TourneeTracking />} />
        <Route path="/boutique/categorie/:slug" element={<Boutique />} />
        <Route path="/boutique/:id" element={<ArticleDetail />} />
        <Route path="/aerogommage" element={<AerogommageForm />} />
        <Route path="/collecte" element={<CollecteForm />} />
        <Route path="/velo" element={<VeloForm />} />
        <Route path="/merci" element={<Merci />} />

        {/* Espace client */}
        <Route path="/compte" element={<AccountLayout />}>
          <Route index element={<AccountInfo />} />
          <Route path="commandes" element={<AccountOrders />} />
          <Route path="commandes/:id" element={<AccountOrderDetail />} />
          <Route path="messagerie" element={<AccountMessages />} />
          <Route path="parametres" element={<AccountSettings />} />
        </Route>
      </Route>

      {/* CRM (dark mode, protégé Clerk) */}
      <Route path="/crm" element={<CrmLayout />}>
        <Route index element={<RequireCrmPermission page="dashboard"><Dashboard /></RequireCrmPermission>} />
        <Route path="notifications" element={<RequireCrmPermission page="notifications"><Notifications /></RequireCrmPermission>} />
        <Route path="messages" element={<RequireCrmPermission page="messages"><Messages /></RequireCrmPermission>} />
        <Route path="documents" element={<RequireCrmPermission page="documents"><Documents /></RequireCrmPermission>} />
        <Route path="demandes" element={<RequireCrmPermission page="demandes"><Demandes /></RequireCrmPermission>} />
        <Route path="calendrier" element={<RequireCrmPermission page="calendrier"><Calendrier /></RequireCrmPermission>} />
        <Route path="clients" element={<RequireCrmPermission page="clients"><Clients /></RequireCrmPermission>} />
        <Route path="articles" element={<RequireCrmPermission page="articles"><Articles /></RequireCrmPermission>} />
        <Route path="arrivages" element={<RequireCrmPermission page="arrivages"><Arrivages /></RequireCrmPermission>} />
        <Route path="caisse" element={<RequireCrmPermission page="caisse"><Caisse /></RequireCrmPermission>} />
        <Route path="ateliers" element={<RequireCrmPermission page="ateliers"><Ateliers /></RequireCrmPermission>} />
        <Route path="sorties" element={<RequireCrmPermission page="sorties"><Sorties /></RequireCrmPermission>} />
        <Route path="tournees" element={<RequireCrmPermission page="tournees"><Tournees /></RequireCrmPermission>} />
        <Route path="equipe" element={<RequireCrmPermission page="equipe"><Equipe /></RequireCrmPermission>} />
        <Route path="admin" element={<RequireCrmPermission page="admin"><Admin /></RequireCrmPermission>} />
      </Route>

      {/* Mode conduite (plein écran mobile, protégé Clerk) */}
      <Route path="/crm/conduite/:tourneeId" element={<TourneeConduite />} />

      <Route path="*" element={<Navigate to="/boutique" replace />} />
    </Routes>
  );
}
