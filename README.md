In PostgreSQL, kindly set up the db and use the queries.sql to set up the tables inside it.
Backend runs on server 5001 - localhost
Frontend runs on 3000 - localhost
Project based on Movie review web application.

Front-end : HTML, CSS, Reactjs

Back-end : JS, node JS, ExpressJS, JWT

Database : PostgreSQL - PgAdmin

DB is listening on port 5432.

To run this project,

Clone the this repository in your local, using the below command In the terminal of your VScode, type, "link" and hit ENTER key. The repo is now available locally,

Frontend:
To cd into the frontend of the project, type, cd "drag and drop the frontend folder" and hit ENTER. Your are in your frontend of the project, add .env file inside src that has the key and value pair of url, the endpoints are about hit->(http://localhost/5001)

Type the below command, in your terminal. " npm i " and hit ENTER key. This should probably install npm packages and their dependencies inside the package.json file.

To enable server locally for frontend at (http://localhost/3000)

a-> Now we will enable our server to listen in port number 3000 for frontend, and to do that, In your terminal, type, "npm start" and hit Enter.

Backend:
To cd into the backend of the project, type, cd "drag and drop the backed folder" and hit ENTER. Your are in your backend of the project, add .env file inside backend that has the key and value pairs of database, base urls, JWT_SECRET, port->(5001)

Type the below command, in your terminal. " npm i " and hit ENTER key. This should probably install npm packages and their dependencies inside the package.json file.

To enable server locally for backend,

a-> Now we will enable our server to listen in port number 3000 for frontend, and to do that, In your terminal, type, "node index.js" and hit Enter.

b->If you have nodemon installed, then "nodemon index.js" and hit Enter.

This makes your server listen in port 5001.

Now you can open your chrome browser and type "localhost:3000" in the address URL and hit ENTER. You can successfully use the application now, both frontend and backend are seamlessly integrated.
Open package.json and make sure that "type" : "module", is present, if not then, type it below "main" : "index.js".
