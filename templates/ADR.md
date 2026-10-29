<!-- Gabarit d'ADR backend. À copier dans docs/adr/NNNN-titre-en-kebab-case.md (numérotation séquentielle, un dossier par composant). Un ADR accepté ne se modifie pas : on en crée un nouveau qui le remplace. Supprimer les lignes « Impact » qui ne s'appliquent pas. -->

# ADR-NNNN : <Verbe à l'infinitif + objet de la décision>

- **Statut** : proposé <!-- proposé | accepté | rejeté | remplacé par ADR-NNNN -->
- **Date** : AAAA-MM-JJ
- **Décideurs** : 
- **Composants concernés** : 
- **Références** : <!-- ticket, MR, tech-design, contrat OpenAPI, ADR liés -->

## Contexte
<!-- Le problème et les forces en présence : contraintes techniques, métier, délais, existant. Faits, pas solution. -->

## Options envisagées

### Option 1 : <nom>
- Avantages : 
- Inconvénients : 
- Risques : 

### Option 2 : <nom>
- Avantages : 
- Inconvénients : 
- Risques : 

## Décision
Nous décidons de <option retenue>.

<!-- Justification, reliée aux forces du contexte. Pourquoi cette option plutôt que les autres. -->

## Conséquences
- Positives : 
- Négatives : 
- Dette acceptée : 

## Impact backend
- **API** : <!-- changement de contrat compatible ou cassant, nouvelle version, consommateurs à adapter -->
- **Kafka** : <!-- topic, clé, schéma, compatibilité, ordre des messages, rejeu -->
- **BDD** : <!-- migration, rétrocompatibilité, volumétrie, plan de retour arrière -->
- **RA (reprise d'antériorité)** : <!-- traitement de l'existant : données historiques à migrer ou recalculer, messages déjà publiés ou à rejouer, anciens clients ; périmètre, méthode, volumétrie, vérification, reprise en cas d'échec -->
- **Transverse** : <!-- sécurité, observabilité, performance, ordre de déploiement -->

## Suivi
- Comment saura-t-on que la décision est bonne : 
- Quand la revoir : 
- ADR liés : 
