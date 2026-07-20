# Contributing to SCMS

First off, thank you for considering contributing to the Student Campus Management System! It's people like you that make SCMS such a great platform.

## 1. Where do I go from here?

If you've noticed a bug or have a feature request, make sure to check if there's already an active [Issue](https://github.com/your-org/scms/issues) open. If not, go ahead and open one!

## 2. Fork & create a branch

If this is something you think you can fix, then fork SCMS and create a branch with a descriptive name.

A good branch name would be (where issue #325 is the ticket you're working on):

```sh
git checkout -b 325-add-dark-mode
```

## 3. Get the test suite running

Make sure your environment is completely configured and that the build passes before you push code.
1. Run `pytest` for the backend.
2. Run `npm run build` and `npm run test` for the frontend.

## 4. Implement your fix or feature

At this point, you're ready to make your changes! Feel free to ask for help; everyone is a beginner at first.

- **Backend Code**: Make sure you conform to PEP8 standards. We recommend utilizing `black` and `isort`.
- **Frontend Code**: Make sure you conform to StandardJS and TypeScript strict rules. Utilize `eslint` and `prettier` formatting before committing.

## 5. Submit your Pull Request

When you are ready to submit a PR, make sure your PR description clearly outlines the problem you are solving, links the relevant Issue, and details how you solved it. 
