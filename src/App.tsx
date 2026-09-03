import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { PublicLayout } from "./components/public/PublicLayout";
import { RequirePublicAccount } from "./components/public/RequirePublicAccount";
import { Boutique } from "./pages/public/Boutique";
import { Kiosk } from "./pages/public/Kiosk";
import { KioskArticle } from "./pages/public/KioskArticle";
import { AcheterArticle } from "./pages/public/AcheterArticle";
import { ArticleDetail } from "./pages/public/ArticleDetail";
import { CartPage } from "./pages/public/CartPage";
import { CheckoutPage } from "./pages/public/CheckoutPage";
import { PaymentLinkPage } from "./pages/public/PaymentLinkPage";
import { Favoris } from "./pages/public/Favoris";
import { TourneeTracking } from "./pages/public/TourneeTracking";
import { AerogommageForm } from "./pages/public/AerogommageForm";
import { CollecteForm } from "./pages/public/CollecteForm";
import { VeloForm } from "./pages/public/VeloForm";
import { LivraisonForm } from "./pages/public/LivraisonForm";
import { DepotForm } from "./pages/public/DepotForm";
import { Merci } from "./pages/public/Merci";
import { Conditions } from "./pages/public/Conditions";
import { Confidentialite } from "./pages/public/Confidentialite";
import { AuthPage } from "./pages/public/AuthPage";
import {
  AccountLayout,
  AccountInfo,
  AccountOrders,
  AccountOrderDetail,
  AccountMessages,
  AccountSettings,
} from "./pages/public/Account";
import { Compte } from "./pages/crm/Compte";
import { CrmLayout } from "./components/crm/CrmLayout";
import { RequireCrmPermission } from "./components/crm/RequireCrmPermission";
import { Dashboard } from "./pages/crm/Dashboard";
import { Demandes } from "./pages/crm/Demandes";
import { Calendrier } from "./pages/crm/Calendrier";
import { Articles } from "./pages/crm/Articles";
import { ArticleFiche } from "./pages/crm/ArticleFiche";
import { Clients } from "./pages/crm/Clients";
import { Taches } from "./pages/crm/AgentsPolyvalents";
import { Notifications } from "./pages/crm/Notifications";
import { Arrivages } from "./pages/crm/Arrivages";
import { Caisse } from "./pages/crm/Caisse";
import { Ateliers } from "./pages/crm/Ateliers";
import { Sorties } from "./pages/crm/Sorties";
import { Tournees } from "./pages/crm/Tournees";
import { Flotte } from "./pages/crm/Flotte";
import { Reservations } from "./pages/crm/Reservations";
import { TourneeConduite } from "./pages/crm/TourneeConduite";
import { Messages } from "./pages/crm/Messages";
import { Documents } from "./pages/crm/Documents";
import { ConfirmRoot } from "./lib/confirm";
import { UpdateAvailableBanner } from "./components/UpdateAvailableBanner";
import { ProfileSync } from "./components/ProfileSync";

export default function App() {
  return (
    <>
    {/* Hors de toute garde d'authentification : l'origine de l'inscription se
        constitue pendant la visite déconnectée. */}
    <ProfileSync app="recycapp" />
    <UpdateAvailableBanner appName="Recycapp" />
    <Routes>
      {/* Vitrine physique : plein écran, sans en-tête ni compte. */}
      <Route path="/kiosk" element={<Kiosk />} />
      <Route path="/kiosk/:id" element={<KioskArticle />} />

      {/* Achat d'un article scanné en vitrine, sur le téléphone du client :
          aucun compte n'est demandé, le paiement passe par Stripe Checkout. */}
      <Route path="/acheter/:id" element={<AcheterArticle />} />

      {/* Public (light mode) */}
      {/* Page dédiée de connexion : hors du shell boutique, comme sur Mes
          Outils et BâtiRe — le portail occupe tout l'écran. */}
      <Route path="/connexion" element={<AuthPage />} />
      <Route path="/inscription" element={<AuthPage initialMode="signup" />} />
      <Route path="/auth" element={<LegacyAuthRedirect />} />

      <Route element={<PublicLayout />}>
        <Route path="/" element={<Navigate to="/boutique" replace />} />
        <Route path="/boutique" element={<Boutique />} />
        <Route
          path="/boutique/panier"
          element={
            <RequirePublicAccount
              title="Connectez-vous pour réserver"
              description="Votre compte permet de suivre votre demande boutique, d'échanger avec notre équipe et de retrouver vos informations."
            >
              <CartPage />
            </RequirePublicAccount>
          }
        />
        <Route
          path="/boutique/paiement"
          element={
            <RequirePublicAccount
              title="Connectez-vous pour payer"
              description="Votre compte permet de suivre votre commande et de retrouver vos justificatifs."
            >
              <CheckoutPage />
            </RequirePublicAccount>
          }
        />
        {/* Lien de paiement envoyé par le CRM : accessible sans compte. */}
        <Route path="/paiement/:token" element={<PaymentLinkPage />} />
        <Route path="/favoris" element={<Favoris />} />
        <Route path="/suivi/:token" element={<TourneeTracking />} />
        <Route path="/boutique/categorie/:slug" element={<Boutique />} />
        <Route path="/boutique/:id" element={<ArticleDetail />} />
        <Route
          path="/aerogommage"
          element={
            <RequirePublicAccount
              title="Connectez-vous pour demander un aérogommage"
              description="Après connexion ou inscription, vous serez renvoyé directement vers ce formulaire."
            >
              <AerogommageForm />
            </RequirePublicAccount>
          }
        />
        <Route
          path="/collecte"
          element={
            <RequirePublicAccount
              title="Connectez-vous pour demander une collecte"
              description="Après connexion ou inscription, vous serez renvoyé directement vers ce formulaire."
            >
              <CollecteForm />
            </RequirePublicAccount>
          }
        />
        <Route
          path="/velo"
          element={
            <RequirePublicAccount
              title="Connectez-vous pour votre demande vélo"
              description="Après connexion ou inscription, vous serez renvoyé directement vers ce formulaire."
            >
              <VeloForm />
            </RequirePublicAccount>
          }
        />
        <Route
          path="/livraison"
          element={
            <RequirePublicAccount
              title="Connectez-vous pour demander une livraison"
              description="Après connexion ou inscription, vous serez renvoyé directement vers ce formulaire."
            >
              <LivraisonForm />
            </RequirePublicAccount>
          }
        />
        <Route
          path="/depot"
          element={
            <RequirePublicAccount
              title="Connectez-vous pour réserver un dépôt"
              description="Après connexion ou inscription, vous serez renvoyé directement vers ce formulaire."
            >
              <DepotForm />
            </RequirePublicAccount>
          }
        />
        <Route path="/merci" element={<Merci />} />
        <Route path="/conditions" element={<Conditions />} />
        <Route path="/confidentialite" element={<Confidentialite />} />

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
        <Route path="articles/:id" element={<RequireCrmPermission page="articles"><ArticleFiche /></RequireCrmPermission>} />
        <Route path="arrivages" element={<RequireCrmPermission page="arrivages"><Arrivages /></RequireCrmPermission>} />
        <Route path="caisse" element={<RequireCrmPermission page="caisse"><Caisse /></RequireCrmPermission>} />
        <Route path="ateliers" element={<RequireCrmPermission page="ateliers"><Ateliers /></RequireCrmPermission>} />
        <Route path="sorties" element={<RequireCrmPermission page="sorties"><Sorties /></RequireCrmPermission>} />
        <Route path="tournees" element={<RequireCrmPermission page="tournees"><Tournees /></RequireCrmPermission>} />
        <Route path="flotte" element={<RequireCrmPermission page="flotte"><Flotte /></RequireCrmPermission>} />
        <Route path="reservations" element={<RequireCrmPermission page="reservations"><Reservations /></RequireCrmPermission>} />
        <Route path="taches" element={<RequireCrmPermission page="agents-polyvalents"><Taches /></RequireCrmPermission>} />
        <Route path="agents-polyvalents" element={<Navigate to="/crm/taches" replace />} />
        <Route path="compte" element={<Compte />} />
      </Route>

      {/* Mode conduite (plein écran mobile, protégé Clerk) */}
      <Route path="/crm/conduite/:tourneeId" element={<TourneeConduite />} />

      <Route path="*" element={<Navigate to="/boutique" replace />} />
    </Routes>
      <ConfirmRoot />
    </>
  );
}

/** Ancien chemin du portail, conservé pour les liens déjà diffusés. */
function LegacyAuthRedirect() {
  const location = useLocation();
  const target = location.hash === "#sign-up" ? "/inscription" : "/connexion";
  return <Navigate to={`${target}${location.search}`} replace />;
}
