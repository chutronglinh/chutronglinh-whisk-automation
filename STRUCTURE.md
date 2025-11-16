# Project Structure

```
whisk-automation/
├── backend/
│   ├── src/
│   │   ├── models/
│   │   │   ├── Account.js
│   │   │   ├── Project.js
│   │   │   ├── Prompt.js
│   │   │   ├── Job.js
│   │   │   └── Image.js
│   │   ├── routes/
│   │   │   ├── accounts.js
│   │   │   ├── projects.js
│   │   │   ├── prompts.js
│   │   │   ├── jobs.js
│   │   │   └── images.js
│   │   ├── controllers/
│   │   │   ├── AccountController.js
│   │   │   ├── ProjectController.js
│   │   │   ├── PromptController.js
│   │   │   ├── JobController.js
│   │   │   └── ImageController.js
│   │   ├── workers/
│   │   │   ├── ProfileWorker.js
│   │   │   ├── CookieWorker.js
│   │   │   ├── ProjectWorker.js
│   │   │   └── ImageWorker.js
│   │   ├── utils/
│   │   │   ├── auth-helper.js
│   │   │   ├── image-generator.js
│   │   │   ├── project-manager.js
│   │   │   └── logger.js
│   │   ├── config/
│   │   │   ├── database.js
│   │   │   └── queue.js
│   │   ├── middleware/
│   │   │   └── errorHandler.js
│   │   └── app.js
│   ├── ecosystem.config.js
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Accounts.jsx
│   │   │   └── Generate.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── store/
│   │   │   └── useStore.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
│
├── scripts/
│   ├── install.sh
│   └── deploy.sh
│
├── .gitignore
├── package.json
└── README.md
```

## File Mapping

### Backend Files (27 files)
1. backend/package.json → backend-package.json
2. backend/.env.example → env-example.txt
3. backend/src/models/Account.js → Account.js
4. backend/src/models/Project.js → Project.js
5. backend/src/models/Prompt.js → Prompt.js
6. backend/src/models/Job.js → Job.js
7. backend/src/models/Image.js → Image.js
8. backend/src/config/database.js → database.js
9. backend/src/config/queue.js → queue.js
10. backend/src/routes/accounts.js → routes-accounts.js
11. backend/src/routes/projects.js → routes-projects.js
12. backend/src/routes/prompts.js → routes-prompts.js
13. backend/src/routes/jobs.js → routes-jobs.js
14. backend/src/routes/images.js → routes-images.js
15. backend/src/controllers/AccountController.js → AccountController.js
16. backend/src/controllers/ProjectController.js → ProjectController.js
17. backend/src/controllers/PromptController.js → PromptController.js
18. backend/src/controllers/JobController.js → JobController.js
19. backend/src/controllers/ImageController.js → ImageController.js
20. backend/src/middleware/errorHandler.js → errorHandler.js
21. backend/src/utils/auth-helper.js → utils-auth-helper.js
22. backend/src/utils/image-generator.js → utils-image-generator.js
23. backend/src/utils/project-manager.js → utils-project-manager.js
24. backend/src/utils/logger.js → logger.js
25. backend/src/workers/ProfileWorker.js → ProfileWorker.js
26. backend/src/workers/CookieWorker.js → CookieWorker.js
27. backend/src/workers/ProjectWorker.js → ProjectWorker.js
28. backend/src/workers/ImageWorker.js → ImageWorker.js
29. backend/src/app.js → app.js
30. backend/ecosystem.config.js → ecosystem.config.js

### Frontend Files (13 files)
31. frontend/package.json → fe-package.json
32. frontend/vite.config.js → fe-vite-config.js
33. frontend/tailwind.config.js → fe-tailwind-config.js
34. frontend/postcss.config.js → fe-postcss.config.js
35. frontend/index.html → fe-index.html
36. frontend/src/main.jsx → fe-main.jsx
37. frontend/src/App.jsx → fe-App.jsx
38. frontend/src/index.css → fe-index.css
39. frontend/src/services/api.js → fe-api.js
40. frontend/src/store/useStore.js → fe-useStore.js
41. frontend/src/pages/Dashboard.jsx → fe-Dashboard.jsx
42. frontend/src/pages/Accounts.jsx → fe-Accounts.jsx
43. frontend/src/pages/Generate.jsx → fe-Generate.jsx

### Root & Scripts (5 files)
44. scripts/install.sh → install.sh
45. scripts/deploy.sh → deploy.sh
46. .gitignore → gitignore.txt
47. package.json → root-package.json
48. README.md → README.md

**Total: 48 files**