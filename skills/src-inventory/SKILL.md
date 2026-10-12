---
name: src-inventory
description: Construit inventory.md, un tableau des versions de Java et Spring Boot pour chaque dépôt GitLab listé dans un fichier Markdown (projets Maven uniquement). Usage - /src-inventory <repos.md>.
user-invocable: true
disable-model-invocation: true
---

# Inventaire des versions Java / Spring Boot

Entrée : un fichier Markdown listant des dépôts GitLab. Sortie : `inventory.md` dans le répertoire courant (n'écraser qu'après en avoir informé l'utilisateur s'il existe déjà).

## 1. Lire la liste des dépôts
Extraire chaque dépôt GitLab du fichier d'entrée, quelle que soit sa forme : liens Markdown, URL nues, lignes de tableau, chemins `group/project`. Conserver le nom du composant quand le fichier en donne un, sinon utiliser le nom du projet. Ignorer tout ce qui n'est pas un dépôt. Indiquer à l'utilisateur le nombre de dépôts trouvés.

## 2. Récupérer les fichiers, ne jamais cloner
Pour chaque dépôt, sur sa branche par défaut, lire uniquement ces fichiers. Privilégier les outils GitLab MCP (get file contents) s'ils sont disponibles dans cette session, sinon `glab api "projects/<url-encoded-path>/repository/files/<url-encoded-file>/raw?ref=<branch>"`.
- `pom.xml` à la racine
- `Dockerfile` à la racine (seulement si nécessaire, voir ci-dessous)
- Pour un projet multi-modules, si le pom racine n'a aucune des deux versions, lire aussi le `pom.xml` du premier module listé dans `<modules>`.

## 3. Extraire les versions (Maven)
**Spring Boot**, la première correspondance l'emporte :
1. `<parent>` avec `artifactId` `spring-boot-starter-parent` -> son `<version>`.
2. `spring-boot-dependencies` importé dans `<dependencyManagement>` -> son `<version>`.
3. `spring-boot-maven-plugin` ou une propriété `spring-boot.version` / `spring-boot-dependencies.version`.
Si la version est une `${property}`, la résoudre depuis `<properties>` du même pom (ou de son parent quand celui-ci est dans le même dépôt). Un parent qui est un pom interne d'entreprise n'est pas résolu : utiliser `null` et noter "parent interne <groupId:artifactId:version>".

**Java**, la première correspondance l'emporte :
1. `<java.version>`, puis `<maven.compiler.release>`, puis `<maven.compiler.source>` / `<maven.compiler.target>`, puis `<release>`/`<source>` dans la configuration de `maven-compiler-plugin`. Normaliser `1.8` en `8`.
2. **Si le pom n'a pas de version de Java, regarder dans le `Dockerfile`** : l'image JDK/JRE dans les lignes `FROM` (par ex. `eclipse-temurin:21-jre`, `openjdk:17`, `maven:3.9-eclipse-temurin-21`) donne la version de Java. Avec plusieurs lignes `FROM` (multi-stage), préférer l'étape d'exécution et le signaler dans les notes.
3. Sinon `null`.

Ne jamais deviner une version. Consigner d'où vient chaque valeur (`pom`, `Dockerfile`, `pom (property)`).

## 4. Produire le JSON, puis générer inventory.md
La sortie est contrainte par `schema.json` dans le dossier de ce skill. Le lire d'abord et le suivre exactement : mêmes noms de propriétés, aucune en trop, aucune manquante.
1. Écrire `inventory.json` dans le répertoire courant : `{ "generated": "<YYYY-MM-DD>", "source_file": "<input file>", "components": [ ... ] }`, un objet par dépôt, dans l'ordre de l'entrée.
   - `status` : `ok`, `non-maven` (pas de `pom.xml`, versions `null`) ou `inaccessible` (dépôt illisible, versions `null`).
   - `java` : version majeure sous forme de chaîne (`"8"`, `"17"`, `"21"`) ou `null` si introuvable. `spring_boot` : par ex. `"3.2.5"` ou `null`. Ne jamais y mettre une supposition ni le texte `?`.
   - `source` : où les valeurs ont été trouvées, parmi `pom`, `pom (property)`, `Dockerfile`.
   - `notes` : tableau de courtes chaînes (Dockerfile multi-stage, pom parent interne, propriété non résolue...).
2. Exécuter `node <this skill folder>/scripts/render.mjs inventory.json inventory.md`. Il valide le JSON par rapport au schéma et écrit le tableau Markdown (`null` affiché `?`, dépôts non ok affichés `-`).
3. S'il affiche `Invalid JSON`, corriger les erreurs listées dans `inventory.json` et le relancer. Ne jamais écrire `inventory.md` à la main. Si Node.js n'est pas disponible, le dire et afficher uniquement le JSON relu à l'œil.

## 5. Rapport
Indiquer à l'utilisateur le nombre de dépôts traités, combien ont des versions non résolues (`null`), et combien n'ont pas pu être lus. Mentionner `inventory.json` et `inventory.md`. Au-delà d'environ 20 dépôts, travailler par lots de 10 et ne garder en contexte que les valeurs extraites, pas le contenu complet des fichiers.
