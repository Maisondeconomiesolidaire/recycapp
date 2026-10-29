import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { Trash2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ArticleForm } from "../../components/crm/ArticleForm";
import { EmptyState } from "../../components/ui/EmptyState";
import { FullSpinner } from "../../components/ui/Spinner";
import { Button } from "../../components/ui/Button";
import { confirmDelete } from "../../lib/confirm";

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
  const remove = useMutation(api.articles.remove);

  function close() {
    navigate("/crm/articles");
  }

  async function handleDelete() {
    if (!article) return;
    const confirmed = await confirmDelete(
      `L'article « ${article.title} » sera supprimé définitivement.`,
    );
    if (!confirmed) return;
    await remove({ id: article._id });
    close();
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
    <>
      <ArticleForm
        key={id}
        variant="page"
        article={creating ? null : (article ?? null)}
        open
        onClose={close}
      />
      {!creating && article && (
        <div className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
          <div className="border-t border-[var(--crm-border)] pt-6">
            <Button variant="outline" onClick={() => void handleDelete()} className="border-red-500/40 text-red-300 hover:border-red-500 hover:bg-red-500/10 hover:text-red-200">
              <Trash2 className="h-4 w-4" />
              Supprimer l'article
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
