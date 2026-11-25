# Une petite histoire photo

Page statique mobile-first, sans dépendance ni étape de compilation. Les photos optimisées et redressées sont dans `photos/` ; les originaux restent dans le dossier source.

## Tester en local

Depuis la racine de ce dépôt, lancer un serveur HTTP :

```powershell
python -m http.server 8000
```

Ouvrir ensuite `http://localhost:8000/` sur l’ordinateur. Pour tester sur un téléphone connecté au même Wi-Fi, remplacer `localhost` par l’adresse IP locale de l’ordinateur, par exemple `http://192.168.1.20:8000/`.

## Publier sur GitHub Pages

1. Ajouter les fichiers du site au dépôt, créer le premier commit sur `main`, puis pousser la branche vers `origin`.
2. Sur GitHub, ouvrir **Settings → Pages**.
3. Dans **Build and deployment**, choisir **Deploy from a branch**, puis sélectionner `main` et le dossier `/ (root)`, et enregistrer.
4. Attendre la fin du déploiement affiché dans l’onglet **Actions**. L’adresse sera `https://kingspyder.github.io/neto_kdo/`.

Les quatre photos sources restent en dehors de ce dépôt ; seules les versions JPEG redressées et réduites utilisées par la page sont publiées.
