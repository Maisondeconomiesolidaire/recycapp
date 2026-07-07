import { Link } from "react-router-dom";
import { LegalList, LegalPage, LegalSection } from "../../components/public/LegalPage";

const CONTACT_EMAIL = "accueil.recyclerie@eco-solidaire.fr";

export function Confidentialite() {
  return (
    <LegalPage title="Politique de confidentialité" updatedAt="7 juillet 2026">
      <LegalSection title="Article 1 – Objet">
        <p>
          La présente Politique de confidentialité a pour objet d'informer les utilisateurs
          de la manière dont La Recyclerie du Pays de Bray, ci-après « nous », collecte,
          utilise et protège leurs données personnelles lors de l'utilisation de sa
          plateforme (site internet et/ou application), conformément au Règlement général
          sur la protection des données (RGPD) et à la loi « Informatique et Libertés ».
        </p>
      </LegalSection>

      <LegalSection title="Article 2 – Responsable du traitement">
        <p>Le responsable du traitement des données personnelles est :</p>
        <p className="text-zinc-600">
          La Recyclerie du Pays de Bray
          <br />
          4 Rue de la Prairie, 60650 Lachapelle-aux-Pots
          <br />
          E-mail : {CONTACT_EMAIL}
          <br />
          Téléphone : 03 75 15 04 78
        </p>
      </LegalSection>

      <LegalSection title="Article 3 – Données collectées">
        <p>
          Nous collectons uniquement les données nécessaires à la fourniture de nos services.
          Selon votre utilisation de la plateforme, il peut s'agir :
        </p>
        <LegalList
          items={[
            "de données d'identité (nom, prénom) ;",
            "de coordonnées (adresse postale, adresse e-mail, numéro de téléphone) ;",
            "des informations relatives à vos demandes (collecte, don, dépôt, aérogommage, réservation d'articles) ;",
            "des photographies et documents que vous nous transmettez ;",
            "de données de compte (identifiants de connexion) ;",
            "de données techniques (adresse IP, type de navigateur, données de navigation) ;",
            "de l'historique de vos échanges avec la recyclerie.",
          ]}
        />
        <p>
          Les champs obligatoires sont signalés dans les formulaires. À défaut, certaines
          fonctionnalités ne pourront pas être fournies.
        </p>
      </LegalSection>

      <LegalSection title="Article 4 – Finalités et bases légales">
        <p>Vos données sont traitées pour les finalités suivantes :</p>
        <LegalList
          items={[
            "gérer votre compte et votre inscription (exécution du contrat / consentement) ;",
            "traiter vos demandes de collecte, de don, de dépôt ou d'aérogommage (exécution du contrat ou mesures précontractuelles) ;",
            "gérer les réservations et commandes d'articles (exécution du contrat) ;",
            "communiquer avec vous et répondre à vos messages (intérêt légitime) ;",
            "assurer la sécurité et le bon fonctionnement de la plateforme (intérêt légitime) ;",
            "respecter nos obligations légales et comptables (obligation légale) ;",
            "vous adresser, le cas échéant, des informations sur nos activités (consentement).",
          ]}
        />
      </LegalSection>

      <LegalSection title="Article 5 – Destinataires des données">
        <p>
          Vos données sont destinées aux équipes habilitées de la recyclerie. Elles peuvent
          également être communiquées à nos prestataires techniques (hébergement,
          authentification, envoi d'e-mails) agissant en qualité de sous-traitants, dans la
          stricte limite nécessaire à l'exécution de leurs missions.
        </p>
        <p>
          Vos données ne sont jamais vendues. Elles peuvent être transmises aux autorités
          compétentes lorsque la loi l'exige.
        </p>
      </LegalSection>

      <LegalSection title="Article 6 – Durée de conservation">
        <p>
          Vos données sont conservées pendant la durée strictement nécessaire aux finalités
          pour lesquelles elles ont été collectées :
        </p>
        <LegalList
          items={[
            "les données de compte : pendant toute la durée de vie du compte, puis supprimées ou anonymisées après une période d'inactivité ;",
            "les données liées à une demande ou une commande : le temps de son traitement, puis conformément aux durées légales de conservation (notamment comptables) ;",
            "les données de contact utilisées à des fins d'information : jusqu'au retrait de votre consentement.",
          ]}
        />
      </LegalSection>

      <LegalSection title="Article 7 – Vos droits">
        <p>
          Conformément à la réglementation, vous disposez des droits suivants sur vos
          données :
        </p>
        <LegalList
          items={[
            "droit d'accès ;",
            "droit de rectification ;",
            "droit à l'effacement ;",
            "droit à la limitation du traitement ;",
            "droit d'opposition ;",
            "droit à la portabilité ;",
            "droit de retirer votre consentement à tout moment ;",
            "droit de définir des directives relatives au sort de vos données après votre décès.",
          ]}
        />
        <p>
          Vous pouvez exercer ces droits en écrivant à : {CONTACT_EMAIL}. Nous pourrons vous
          demander de justifier de votre identité afin de traiter votre demande.
        </p>
        <p>
          Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une
          réclamation auprès de la Commission nationale de l'informatique et des libertés
          (CNIL), 3 Place de Fontenoy, 75007 Paris — www.cnil.fr.
        </p>
      </LegalSection>

      <LegalSection title="Article 8 – Cookies et traceurs">
        <p>
          La plateforme peut utiliser des cookies et technologies similaires nécessaires à
          son fonctionnement (par exemple pour la connexion à votre compte ou la gestion de
          votre panier), ainsi que, le cas échéant, des cookies de mesure d'audience.
        </p>
        <p>
          Les cookies non strictement nécessaires ne sont déposés qu'avec votre consentement,
          que vous pouvez retirer à tout moment. Vous pouvez également configurer votre
          navigateur pour limiter ou supprimer les cookies.
        </p>
      </LegalSection>

      <LegalSection title="Article 9 – Sécurité">
        <p>
          Nous mettons en œuvre des mesures techniques et organisationnelles appropriées afin
          de protéger vos données contre la perte, l'accès non autorisé, la divulgation ou
          l'altération. L'accès aux données est limité aux personnes habilitées.
        </p>
      </LegalSection>

      <LegalSection title="Article 10 – Transferts hors de l'Union européenne">
        <p>
          Vos données sont en principe hébergées et traitées au sein de l'Union européenne.
          Si un transfert vers un pays tiers devait avoir lieu par l'intermédiaire d'un
          prestataire, il serait encadré par des garanties appropriées conformément au RGPD.
        </p>
      </LegalSection>

      <LegalSection title="Article 11 – Modification de la politique">
        <p>
          La présente Politique de confidentialité peut être modifiée à tout moment,
          notamment pour tenir compte d'évolutions légales, réglementaires ou techniques. La
          version applicable est celle accessible sur la plateforme à la date de votre
          consultation.
        </p>
      </LegalSection>

      <LegalSection title="Article 12 – Contact">
        <p>
          Pour toute question relative à la présente politique ou au traitement de vos
          données, vous pouvez nous contacter à l'adresse : {CONTACT_EMAIL}.
        </p>
        <p>
          Cette politique complète les{" "}
          <Link to="/conditions" className="font-medium text-brand-600 underline">
            Conditions générales d'utilisation
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
