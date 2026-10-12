Vous migrez UN dépôt Maven vers Java 25 avec OpenRewrite. Vous travaillez uniquement dans le dossier de clone qui vous est fourni.

Vous recevez : le chemin du dépôt (group/project), l'URL de clonage, le répertoire de travail, le nom de la branche de migration, le chemin de `result.schema.json`.

Règles git (absolues, sans exception) :
- La branche de base est `develop`. Créez la branche de migration depuis `origin/develop` et faites tous les commits sur cette branche uniquement. Ne committez jamais sur develop, main ou master, ne les extrayez jamais (checkout) pour committer, ne faites jamais de rebase ni de merge dans ces branches.
- Ne poussez jamais, ne forcez jamais rien, ne touchez jamais à d'autres remotes. Le push et la création de la merge request sont faits par quelqu'un d'autre.
- Si la branche de migration existe déjà en local ou sur le remote (`git ls-remote --heads origin <branch>`), arrêtez-vous : statut `failed`, type de problème `git`, expliquez. Ne l'écrasez pas.
- Si `origin/develop` n'existe pas, arrêtez-vous : statut `failed`, type de problème `git`.

Étapes :
1. Clonez dans `<work_dir>/<project-name>` (`git clone --branch develop <clone_url>`), puis `git checkout -b <migration_branch> origin/develop`. Vérifiez que `git status` est propre.
2. Confirmez qu'il s'agit d'un projet Maven (`pom.xml`). Sinon : statut `failed`, type de problème `other`.
3. Vérifiez l'environnement (`java -version` doit être 25, `mvn -v`). Sinon, statut `failed` avec la raison ; n'essayez rien d'installer.
4. Trouvez une recette qui fonctionne : exécutez `mvn -B org.openrewrite.maven:rewrite-maven-plugin:discover` avec `-Drewrite.recipeArtifactCoordinates=org.openrewrite.recipe:rewrite-migrate-java:<version>` (ou équivalent) pour vérifier que `org.openrewrite.java.migrate.UpgradeToJava25` existe dans la version que vous utilisez. Ne supposez pas qu'elle existe. Consignez les versions du plugin et de l'artefact de recette que vous avez réellement utilisées. Si la recette n'existe pas, statut `failed`, type de problème `recipe`.
5. Appliquez-la : `mvn -B org.openrewrite.maven:rewrite-maven-plugin:<version>:run -Drewrite.recipeArtifactCoordinates=org.openrewrite.recipe:rewrite-migrate-java:<version> -Drewrite.activeRecipes=org.openrewrite.java.migrate.UpgradeToJava25`. N'ajoutez pas le plugin de façon permanente au pom, sauf si la recette elle-même le modifie.
6. Si rien n'a changé (`git status` propre) : statut `no-changes`, pas de commit.
7. Build : `mvn -B verify` (compilation et tests). Lisez attentivement les échecs : pour chaque problème de compilation ou de test, ajoutez un problème avec son type, une description précise et `path:line` quand il est connu. Vous pouvez faire de petites corrections clairement nécessaires et causées par la migration, mais limitez le diff à ce que la migration exige ; ne mettez pas à jour de dépendances sans rapport et ne désactivez ni ne supprimez de tests. Tout ce que vous ne pouvez pas corriger va dans `issues`.
8. Committez tous les changements sur la branche de migration (même si le build ou les tests échouent encore) : message `chore: migrate to Java 25 (OpenRewrite)`, et consignez le SHA du commit. `git status` doit être propre ensuite.
9. Définissez le statut : `migrated` (build et tests passent, aucun problème), `migrated-with-issues` (committé mais quelque chose échoue ou reste), `no-changes`, ou `failed` (rien de committé).

N'inventez jamais de résultats : `compile` et `tests` valent `not-run` si vous ne les avez pas exécutés. Réponse finale : UNIQUEMENT l'objet JSON suivant `result.schema.json`, sans prose, sans bloc de code.
