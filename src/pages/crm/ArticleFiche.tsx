import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ArticleForm } from "../../components/crm/ArticleForm";
import { EmptyState } from "../../components/ui/EmptyState";
import { FullSpinner } from "../../components/ui/Spinner";
import { Button } from "../../components/ui/Button";

/**
 * Fiche article en page pleine (`/crm/articles/:id`, `/crm/articles/nouveau`).
 *
 * Une fiche article est longue — photos, analyse IA, prix, caisse, références :
 * la popup obligeait à scroller dans une fenêtre dans la fenêtre, et l'URL ne
 * pointait sur rien de partageable.
 */
export function ArticleFiche() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const creating = id === "nouveau";

  const article = useQuery(
    api.articles.getForCrm,
    creating || !id ? "skip" : { id: id as Id<"articles"> },
  );

  function close() {
    navigate("/crm/articles");
  }

  if (!creating && article === undefined) {
    return <FullSpinner label="Chargement de la fiche…" />;
  }

  if (!creating && article === null) {
    return (
      <EmptyState
        title="Article introuvable"
        description="Cet article a peut-être été supprimé."
        action={<Button onClick={close}>Retour au stock</Button>}
      />
    );
  }

  return (
    <ArticleForm
      key={id}
      variant="page"
      article={creating ? null : (article ?? null)}
      open
      onClose={close}
    />
  );
}
