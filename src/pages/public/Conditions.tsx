import { Link } from "react-router-dom";
import { LegalList, LegalPage, LegalSection } from "../../components/public/LegalPage";

const CONTACT_EMAIL = "accueil.recyclerie@eco-solidaire.fr";

export function Conditions() {
  return (
    <LegalPage title="Conditions générales d'utilisation" updatedAt="7 juillet 2026">
      <LegalSection title="Article 1 – Objet">
        <p>
          Les présentes Conditions générales d'utilisation, ci-après les « CGU », ont
          pour objet de définir les règles applicables à l'accès et à l'utilisation du
          site internet et/ou de l'application <strong>La Recyclerie du Pays de Bray</strong>,
          ci-après la « Plateforme ».
        </p>
        <p>La Plateforme est exploitée par :</p>
        <p className="text-zinc-600">
          La Recyclerie du Pays de Bray
          <br />
          Forme juridique : Association loi 1901
          <br />
          Siège social : 4 Rue de la Prairie, 60650 Lachapelle-aux-Pots
          <br />
          SIREN/SIRET : [numéro à compléter]
          <br />
          Adresse électronique : {CONTACT_EMAIL}
          <br />
          Téléphone : 03 75 15 04 78
          <br />
          Directeur de la publication : [nom et fonction à compléter]
        </p>
        <p>La Plateforme permet notamment aux utilisateurs :</p>
        <LegalList
          items={[
            "de créer et gérer un compte personnel ;",
            "de consulter les objets et articles proposés à la vente ;",
            "de demander une collecte ou un enlèvement d'objets ;",
            "de proposer un don ou un dépôt d'objets ;",
            "de demander des informations ou un devis pour une prestation d'aérogommage ;",
            "de prendre contact avec la recyclerie ;",
            "de suivre, lorsque cette fonctionnalité est disponible, leurs demandes, commandes ou prestations.",
          ]}
        />
        <p>
          Les présentes CGU régissent uniquement l'utilisation de la Plateforme. Les
          ventes de produits et les prestations payantes sont soumises aux Conditions
          générales de vente applicables.
        </p>
      </LegalSection>

      <LegalSection title="Article 2 – Acceptation des CGU">
        <p>
          La création d'un compte et l'utilisation de la Plateforme impliquent
          l'acceptation pleine et entière des présentes CGU.
        </p>
        <p>Lors de son inscription, l'utilisateur doit cocher la case suivante :</p>
        <p className="border-l-2 border-zinc-200 pl-4 italic text-zinc-600">
          « J'ai lu et j'accepte les Conditions générales d'utilisation et la Politique
          de confidentialité. »
        </p>
        <p>L'utilisateur ne peut créer un compte s'il n'accepte pas les présentes CGU.</p>
        <p>
          Les CGU sont accessibles à tout moment depuis la Plateforme. Il est recommandé
          à l'utilisateur d'en conserver une copie.
        </p>
      </LegalSection>

      <LegalSection title="Article 3 – Conditions d'accès">
        <p>
          La consultation générale de la Plateforme peut être accessible sans création de
          compte.
        </p>
        <p>
          Certaines fonctionnalités nécessitent toutefois la création d'un compte
          personnel, notamment pour effectuer une demande, passer une commande,
          enregistrer des coordonnées ou suivre une opération.
        </p>
        <p>
          L'utilisateur doit être âgé d'au moins 18 ans et disposer de la capacité
          juridique nécessaire pour utiliser les services proposés.
        </p>
        <p>
          L'utilisation de la Plateforme par un mineur doit être effectuée sous la
          responsabilité et avec l'autorisation de son représentant légal.
        </p>
        <p>
          L'accès à la Plateforme nécessite une connexion à Internet et un équipement
          compatible. Les coûts liés à la connexion et à l'équipement restent à la charge
          de l'utilisateur.
        </p>
      </LegalSection>

      <LegalSection title="Article 4 – Création du compte utilisateur">
        <p>
          Pour créer un compte, l'utilisateur doit renseigner les informations demandées
          dans le formulaire d'inscription.
        </p>
        <p>L'utilisateur s'engage à communiquer des informations :</p>
        <LegalList items={["exactes ;", "complètes ;", "sincères ;", "à jour."]} />
        <p>L'utilisateur s'engage à mettre à jour ses informations en cas de changement.</p>
        <p>
          Un seul compte doit être créé par personne, sauf autorisation particulière de
          l'exploitant de la Plateforme.
        </p>
        <p>
          L'exploitant se réserve le droit de refuser ou de supprimer une inscription
          comportant des informations manifestement fausses, incomplètes, frauduleuses ou
          portant atteinte aux droits d'un tiers.
        </p>
      </LegalSection>

      <LegalSection title="Article 5 – Identifiants et sécurité du compte">
        <p>Le compte utilisateur est strictement personnel.</p>
        <p>
          L'utilisateur est responsable de la confidentialité de ses identifiants, mots de
          passe et moyens de connexion.
        </p>
        <p>
          Il s'engage à ne pas communiquer ses accès à un tiers et à prendre toutes les
          précautions nécessaires pour empêcher une utilisation non autorisée de son
          compte.
        </p>
        <p>
          Toute action réalisée depuis le compte de l'utilisateur est présumée avoir été
          effectuée par celui-ci, sauf preuve contraire.
        </p>
        <p>
          En cas de perte, de vol, de divulgation ou d'utilisation frauduleuse de ses
          identifiants, l'utilisateur doit en informer immédiatement l'exploitant à
          l'adresse suivante : {CONTACT_EMAIL}
        </p>
        <p>L'exploitant pourra suspendre temporairement le compte afin d'en sécuriser l'accès.</p>
      </LegalSection>

      <LegalSection title="Article 6 – Utilisation autorisée de la Plateforme">
        <p>
          L'utilisateur s'engage à utiliser la Plateforme de manière loyale, licite et
          conforme à sa destination.
        </p>
        <p>Il est notamment interdit :</p>
        <LegalList
          items={[
            "d'utiliser la Plateforme à des fins frauduleuses ou illégales ;",
            "de fournir de fausses informations ;",
            "d'usurper l'identité d'une autre personne ;",
            "de perturber ou tenter de perturber le fonctionnement de la Plateforme ;",
            "de contourner les dispositifs de sécurité ;",
            "d'introduire un virus, un programme malveillant ou tout autre élément nuisible ;",
            "de collecter ou d'extraire massivement les données de la Plateforme ;",
            "de porter atteinte aux droits, à l'image ou à la réputation de la recyclerie, de ses salariés, bénévoles, partenaires ou autres utilisateurs ;",
            "de publier ou transmettre des contenus injurieux, discriminatoires, violents, illicites ou portant atteinte aux droits d'un tiers ;",
            "d'utiliser la Plateforme à des fins commerciales non autorisées.",
          ]}
        />
      </LegalSection>

      <LegalSection title="Article 7 – Collecte, don et dépôt d'objets">
        <p>
          La Plateforme peut permettre à l'utilisateur de proposer des objets en vue de
          leur don, de leur dépôt, de leur réemploi ou de leur collecte.
        </p>
        <p>
          Toute demande transmise en ligne constitue uniquement une proposition de
          l'utilisateur. Elle ne vaut pas acceptation définitive par la recyclerie.
        </p>
        <p>La collecte ou la reprise d'un objet reste soumise notamment :</p>
        <LegalList
          items={[
            "à la nature de l'objet ;",
            "à son état ;",
            "à ses dimensions et à son poids ;",
            "à son accessibilité ;",
            "à sa possibilité de réemploi, de valorisation ou de recyclage ;",
            "aux capacités de stockage de la recyclerie ;",
            "à la disponibilité des équipes et des véhicules ;",
            "au respect des règles de sécurité.",
          ]}
        />
        <p>
          La recyclerie se réserve le droit d'accepter ou de refuser tout ou partie des
          objets proposés.
        </p>
        <p>Sauf accord écrit contraire, la recyclerie peut notamment refuser :</p>
        <LegalList
          items={[
            "les objets dangereux ou contaminés ;",
            "les produits chimiques ;",
            "les matières explosives ou inflammables ;",
            "les déchets médicaux ;",
            "les bouteilles de gaz ;",
            "les produits contenant de l'amiante ;",
            "les objets infestés, très sales ou présentant un risque sanitaire ;",
            "les objets trop dégradés pour être réemployés ou valorisés ;",
            "tout objet dont la collecte ou le traitement nécessiterait une autorisation particulière.",
          ]}
        />
        <p>
          L'utilisateur garantit qu'il est propriétaire des objets proposés ou qu'il
          dispose de l'autorisation nécessaire pour les remettre à la recyclerie.
        </p>
        <p>
          Il garantit également que les objets ne sont ni volés, ni contrefaits, ni grevés
          de droits appartenant à un tiers.
        </p>
        <p>
          Lorsqu'un objet est définitivement remis à la recyclerie, sa propriété est
          transférée à celle-ci, sauf document ou accord écrit prévoyant expressément le
          contraire.
        </p>
        <p>
          La recyclerie peut ensuite, selon l'état et la nature de l'objet, le nettoyer, le
          réparer, le transformer, le démonter, le revendre, le donner, le recycler ou
          l'orienter vers une filière de traitement adaptée.
        </p>
      </LegalSection>

      <LegalSection title="Article 8 – Demandes de collecte">
        <p>
          L'utilisateur doit communiquer des informations suffisamment précises sur les
          objets à collecter, notamment leur nature, leur nombre, leur état, leurs
          dimensions et les éventuelles difficultés d'accès.
        </p>
        <p>Des photographies pourront être demandées avant la validation de la collecte.</p>
        <p>
          Une date proposée sur la Plateforme n'est définitive qu'après confirmation de la
          recyclerie.
        </p>
        <p>
          L'utilisateur doit garantir un accès raisonnable et sécurisé aux objets à la date
          convenue.
        </p>
        <p>Il doit notamment signaler à l'avance :</p>
        <LegalList
          items={[
            "la présence d'escaliers ;",
            "l'absence d'ascenseur ;",
            "les difficultés de stationnement ;",
            "les accès étroits ;",
            "les objets particulièrement lourds ou volumineux ;",
            "tout risque susceptible d'affecter la sécurité de l'intervention.",
          ]}
        />
        <p>
          La recyclerie peut refuser ou interrompre une collecte lorsque les conditions
          réelles ne correspondent pas aux informations communiquées ou lorsqu'elles
          présentent un risque pour les personnes, les locaux, les véhicules ou les biens.
        </p>
      </LegalSection>

      <LegalSection title="Article 9 – Prestations d'aérogommage">
        <p>
          La Plateforme peut permettre de demander des informations, une estimation ou un
          devis pour une prestation d'aérogommage.
        </p>
        <p>
          Toute estimation effectuée à partir de photographies ou d'informations
          communiquées à distance est indicative.
        </p>
        <p>Le prix définitif et les conditions d'intervention peuvent dépendre notamment :</p>
        <LegalList
          items={[
            "de la nature du support ;",
            "des dimensions de l'objet ;",
            "de son état réel ;",
            "du type de peinture, vernis, corrosion ou revêtement à retirer ;",
            "de la présence éventuelle de substances ou matériaux dangereux ;",
            "du niveau de finition demandé ;",
            "des opérations de démontage, transport ou protection nécessaires.",
          ]}
        />
        <p>
          La prestation ne commence qu'après acceptation du devis ou du document contractuel
          correspondant.
        </p>
        <p>
          L'utilisateur doit signaler toute information connue concernant la composition,
          l'ancienneté et les traitements antérieurs du support.
        </p>
        <p>
          La recyclerie peut refuser ou interrompre une prestation lorsqu'elle découvre un
          risque technique, sanitaire ou environnemental qui n'avait pas été signalé.
        </p>
      </LegalSection>

      <LegalSection title="Article 10 – Articles proposés à la vente">
        <p>
          Les articles proposés par une recyclerie peuvent être des produits d'occasion,
          réemployés, réparés, restaurés ou transformés.
        </p>
        <p>
          Ils peuvent présenter des marques d'usage, variations, irrégularités ou défauts
          esthétiques compatibles avec leur caractère d'occasion ou leur histoire.
        </p>
        <p>
          Les photographies et descriptions ont pour objectif de présenter les
          caractéristiques essentielles des articles. De légères différences peuvent
          toutefois exister, notamment en matière de couleur, de texture ou de rendu à
          l'écran.
        </p>
        <p>
          Les conditions relatives aux prix, paiements, retraits, livraisons, garanties,
          retours et droits de rétractation sont précisées dans les Conditions générales de
          vente.
        </p>
      </LegalSection>

      <LegalSection title="Article 11 – Contenus transmis par l'utilisateur">
        <p>
          L'utilisateur peut être amené à transmettre des textes, photographies, documents
          ou informations.
        </p>
        <p>
          Il garantit qu'il dispose des droits et autorisations nécessaires pour transmettre
          ces contenus.
        </p>
        <p>Il s'engage à ne pas transmettre de contenu :</p>
        <LegalList
          items={[
            "illicite ;",
            "mensonger ;",
            "injurieux ;",
            "discriminatoire ;",
            "violent ;",
            "obscène ;",
            "frauduleux ;",
            "portant atteinte à la vie privée ;",
            "portant atteinte à un droit d'auteur, une marque ou tout autre droit appartenant à un tiers.",
          ]}
        />
        <p>
          L'utilisateur autorise la recyclerie à utiliser les contenus transmis dans la
          seule mesure nécessaire au traitement de sa demande, de sa collecte, de sa
          commande ou de sa prestation.
        </p>
        <p>
          Aucune photographie permettant d'identifier l'utilisateur ou son domicile ne sera
          utilisée à des fins de communication sans son autorisation, sauf obligation
          légale.
        </p>
      </LegalSection>

      <LegalSection title="Article 12 – Disponibilité de la Plateforme">
        <p>L'exploitant s'efforce d'assurer un accès régulier à la Plateforme.</p>
        <p>
          Toutefois, l'accès peut être temporairement interrompu, limité ou ralenti
          notamment en raison :
        </p>
        <LegalList
          items={[
            "d'une maintenance ;",
            "d'une mise à jour ;",
            "d'un incident technique ;",
            "d'une panne ;",
            "d'une intervention de sécurité ;",
            "d'un événement extérieur ;",
            "d'un cas de force majeure.",
          ]}
        />
        <p>
          L'exploitant ne garantit pas un fonctionnement continu, permanent ou exempt
          d'erreurs de la Plateforme.
        </p>
        <p>
          Il pourra modifier, suspendre ou supprimer une fonctionnalité lorsque cela est
          nécessaire, sans que cette modification ouvre automatiquement droit à
          indemnisation.
        </p>
      </LegalSection>

      <LegalSection title="Article 13 – Suspension ou suppression d'un compte">
        <p>L'exploitant peut suspendre ou supprimer le compte d'un utilisateur en cas :</p>
        <LegalList
          items={[
            "de violation des présentes CGU ;",
            "d'utilisation frauduleuse ou abusive ;",
            "de fourniture de fausses informations ;",
            "d'atteinte à la sécurité de la Plateforme ;",
            "d'atteinte aux droits d'un tiers ;",
            "de comportement grave ou répété portant préjudice à la recyclerie ;",
            "d'obligation légale ou réglementaire.",
          ]}
        />
        <p>
          Sauf urgence, fraude ou risque de sécurité, l'utilisateur pourra être informé du
          motif de la suspension ou de la suppression.
        </p>
        <p>
          L'utilisateur peut demander la suppression de son compte depuis les paramètres
          prévus à cet effet ou en écrivant à : {CONTACT_EMAIL}
        </p>
        <p>
          La suppression du compte n'entraîne pas nécessairement la suppression immédiate de
          toutes les données lorsque leur conservation est nécessaire pour respecter une
          obligation légale, exécuter un contrat, traiter un litige ou assurer la défense
          des droits de la recyclerie.
        </p>
      </LegalSection>

      <LegalSection title="Article 14 – Propriété intellectuelle">
        <p>
          La structure de la Plateforme ainsi que les textes, logos, marques, illustrations,
          photographies, éléments graphiques, vidéos, bases de données et logiciels qui la
          composent sont protégés par les règles relatives à la propriété intellectuelle.
        </p>
        <p>Sauf autorisation préalable et écrite, l'utilisateur ne peut pas :</p>
        <LegalList
          items={[
            "reproduire ;",
            "représenter ;",
            "modifier ;",
            "adapter ;",
            "diffuser ;",
            "extraire ;",
            "exploiter commercialement ;",
          ]}
        />
        <p>tout ou partie de la Plateforme ou de ses contenus.</p>
        <p>
          L'utilisation de la Plateforme ne transfère aucun droit de propriété intellectuelle
          à l'utilisateur.
        </p>
      </LegalSection>

      <LegalSection title="Article 15 – Données personnelles">
        <p>
          Les données personnelles collectées lors de l'inscription et de l'utilisation de
          la Plateforme sont traitées conformément à la réglementation applicable.
        </p>
        <p>Les informations relatives notamment :</p>
        <LegalList
          items={[
            "aux données collectées ;",
            "aux finalités des traitements ;",
            "aux bases légales ;",
            "aux destinataires ;",
            "aux durées de conservation ;",
            "aux éventuels sous-traitants ;",
            "aux droits des utilisateurs ;",
            "aux modalités d'exercice de ces droits ;",
          ]}
        />
        <p>
          sont détaillées dans la{" "}
          <Link to="/confidentialite" className="font-medium text-brand-600 underline">
            Politique de confidentialité
          </Link>
          , accessible depuis la Plateforme.
        </p>
        <p>
          Pour toute question relative aux données personnelles ou pour exercer ses droits,
          l'utilisateur peut écrire à : {CONTACT_EMAIL}
        </p>
        <p>
          L'utilisateur peut également introduire une réclamation auprès de la Commission
          nationale de l'informatique et des libertés, la CNIL.
        </p>
      </LegalSection>

      <LegalSection title="Article 16 – Liens vers des sites tiers">
        <p>
          La Plateforme peut contenir des liens vers des sites ou services exploités par des
          tiers.
        </p>
        <p>
          L'exploitant ne contrôle pas ces sites et ne peut pas être tenu responsable de leur
          disponibilité, de leur contenu, de leur sécurité ou de leurs pratiques en matière
          de données personnelles.
        </p>
        <p>
          L'utilisateur est invité à consulter les conditions et politiques propres à chaque
          site tiers.
        </p>
      </LegalSection>

      <LegalSection title="Article 17 – Responsabilité">
        <p>
          L'utilisateur est responsable de l'utilisation qu'il fait de la Plateforme, des
          informations qu'il communique et des conséquences de ses actions.
        </p>
        <p>
          L'exploitant est responsable des dommages directs qui lui sont imputables dans les
          conditions prévues par la loi.
        </p>
        <p>
          Il ne pourra toutefois pas être tenu responsable d'un dommage résultant notamment :
        </p>
        <LegalList
          items={[
            "d'une mauvaise utilisation de la Plateforme ;",
            "d'informations fausses, incomplètes ou tardives transmises par l'utilisateur ;",
            "d'une utilisation non autorisée du compte liée à un défaut de vigilance de l'utilisateur ;",
            "d'une incompatibilité de l'équipement ou du navigateur de l'utilisateur ;",
            "d'un dysfonctionnement du réseau Internet ;",
            "d'un fait imputable à un tiers ;",
            "d'un événement relevant de la force majeure.",
          ]}
        />
        <p>
          Aucune disposition des présentes CGU ne peut exclure ou limiter une responsabilité
          qui ne pourrait légalement être exclue ou limitée.
        </p>
      </LegalSection>

      <LegalSection title="Article 18 – Force majeure">
        <p>
          Aucune partie ne pourra être tenue responsable d'un manquement causé par un
          événement de force majeure au sens de la législation française.
        </p>
        <p>
          La partie empêchée informe l'autre partie dans les meilleurs délais lorsque cet
          événement affecte directement l'exécution d'une obligation.
        </p>
      </LegalSection>

      <LegalSection title="Article 19 – Modification des CGU">
        <p>
          L'exploitant peut modifier les présentes CGU afin de tenir compte notamment :
        </p>
        <LegalList
          items={[
            "d'une évolution de la Plateforme ;",
            "d'une modification des services ;",
            "d'une évolution technique ;",
            "d'une évolution légale ou réglementaire ;",
            "d'une nécessité liée à la sécurité.",
          ]}
        />
        <p>
          La version applicable est celle accessible sur la Plateforme à la date de son
          utilisation.
        </p>
        <p>
          En cas de modification substantielle, les utilisateurs disposant d'un compte
          pourront être informés par e-mail ou lors de leur prochaine connexion.
        </p>
        <p>Lorsque cela est nécessaire, une nouvelle acceptation pourra être demandée.</p>
      </LegalSection>

      <LegalSection title="Article 20 – Droit applicable et réclamations">
        <p>Les présentes CGU sont soumises au droit français.</p>
        <p>Toute réclamation concernant l'utilisation de la Plateforme peut être adressée à :</p>
        <p className="text-zinc-600">
          La Recyclerie du Pays de Bray
          <br />
          4 Rue de la Prairie, 60650 Lachapelle-aux-Pots
          <br />
          {CONTACT_EMAIL}
          <br />
          03 75 15 04 78
        </p>
        <p>
          En cas de différend, les parties s'efforceront de rechercher une solution amiable
          avant toute action judiciaire.
        </p>
        <p>
          Lorsque l'utilisateur agit en qualité de consommateur et que le différend concerne
          une vente ou une prestation payante, les règles relatives à la médiation de la
          consommation sont précisées dans les Conditions générales de vente.
        </p>
        <p>
          À défaut de résolution amiable, le litige sera porté devant la juridiction
          compétente conformément aux règles légales applicables.
        </p>
      </LegalSection>

      <LegalSection title="Article 21 – Contact">
        <p>
          Pour toute question relative aux présentes CGU ou au fonctionnement de la
          Plateforme, l'utilisateur peut contacter la recyclerie :
        </p>
        <p className="text-zinc-600">
          La Recyclerie du Pays de Bray
          <br />
          Adresse : 4 Rue de la Prairie, 60650 Lachapelle-aux-Pots
          <br />
          E-mail : {CONTACT_EMAIL}
          <br />
          Téléphone : 03 75 15 04 78
        </p>
        <p className="text-zinc-600">
          Horaires :
          <br />
          Mardi : 14h00 – 17h00
          <br />
          Mercredi : 14h00 – 17h00
          <br />
          Jeudi : 14h00 – 17h00
          <br />
          Vendredi : 14h00 – 17h00
          <br />
          Samedi : 14h00 – 17h00
          <br />
          Dimanche : fermé
          <br />
          Lundi : fermé
        </p>
      </LegalSection>
    </LegalPage>
  );
}
