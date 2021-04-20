const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
var format = require("date-fns/format");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");
let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is Running at http://localhost:3000");
    });
  } catch (e) {
    console.log(`Db Error : ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const sqlObjectToResponseObject = (todo) => {
  return {
    id: todo.id,
    todo: todo.todo,
    priority: todo.priority,
    status: todo.status,
    category: todo.category,
    dueDate: todo.due_date,
  };
};
const queryValidation = (request, response, next) => {
  const { status, priority, search_q = "", category, date } = request.query;

  let checkStatus = false;

  if (search_q.length > 0) checkStatus = true;

  if (status !== undefined)
    if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE")
      checkStatus = true;
    else {
      checkStatus = false;
      response.status(400);
      response.send("Invalid Todo Status");
    }
  if (date !== undefined) {
    const arr = date.split("-");
    const day = parseInt(arr[2]);
    const month = parseInt(arr[1]) - 1;
    const year = parseInt(arr[0]);

    const formateDate = format(new Date(year, month, day), "yyy-MM-dd");

    if (date === formateDate) checkStatus = true;
    else {
      response.status(400);
      response.send("Invalid Todo Due Date");
    }
  }
  if (priority !== undefined)
    if (priority === "HIGH" || priority === "MEDIUM" || priority === "LOW")
      checkStatus = true;
    else {
      checkStatus = false;
      response.status(400);
      response.send("Invalid Todo Priority");
    }
  if (category !== undefined)
    if (category === "WORK" || category === "HOME" || category === "LEARNING")
      checkStatus = true;
    else {
      checkStatus = false;
      response.status(400);
      response.send("Invalid Todo Category");
    }
  if (checkStatus) next();
};

const bodyValidation = (request, response, next) => {
  const { status, priority, todo, category, dueDate } = request.body;

  let checkStatus = false;

  let anyWrongEntry = true;

  if (todo !== undefined && anyWrongEntry) {
    checkStatus = true;
  }
  if (status !== undefined && anyWrongEntry)
    if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE")
      checkStatus = true;
    else {
      checkStatus = false;
      anyWrongEntry = false;
      response.status(400);
      response.send("Invalid Todo Status");
    }
  if (dueDate !== undefined && anyWrongEntry) {
    const arr = dueDate.split("-");
    const day = parseInt(arr[2]);
    const month = parseInt(arr[1]) - 1;
    const year = parseInt(arr[0]);

    const formateDate = format(new Date(year, month, day), "yyy-MM-dd");

    if (dueDate === formateDate) checkStatus = true;
    else {
      anyWrongEntry = false;
      checkStatus = false;
      response.status(400);
      response.send("Invalid Due Date");
    }
  }
  if (priority !== undefined && anyWrongEntry)
    if (priority === "HIGH" || priority === "MEDIUM" || priority === "LOW")
      checkStatus = true;
    else {
      checkStatus = false;
      anyWrongEntry = false;
      response.status(400);
      response.send("Invalid Todo Priority");
    }
  if (category !== undefined && anyWrongEntry)
    if (category === "WORK" || category === "HOME" || category === "LEARNING")
      checkStatus = true;
    else {
      checkStatus = false;
      anyWrongEntry = false;
      response.status(400);
      response.send("Invalid Todo Category");
    }
  if (checkStatus && anyWrongEntry) next();
};

app.get("/todos/", queryValidation, async (request, response) => {
  const { status, priority, search_q = "", category } = request.query;
  let requiredQuery = "";
  switch (true) {
    case status !== undefined && priority !== undefined:
      requiredQuery = `
            SELECT
                 *
            FROM 
                todo
            WHERE
                status = '${status}' AND 
                priority ='${priority}';`;
      break;
    case category !== undefined && status !== undefined:
      requiredQuery = `
            SELECT
                *
            FROM 
                todo
            WHERE
                category = '${category}'
                AND status = '${status}';`;
      break;
    case category !== undefined && priority !== undefined:
      requiredQuery = `
            SELECT
                *
            FROM 
                todo
            WHERE
                category = '${category}' 
                AND priority = '${priority}';`;
      break;
    case priority !== undefined:
      requiredQuery = `
                SELECT
                    *
                FROM 
                    todo
                WHERE
                    priority LIKE '${priority}';`;
      break;
    case status !== undefined:
      requiredQuery = `
                SELECT
                    *
                FROM 
                    todo
                WHERE
                    status = '${status}';`;
      break;
    case category !== undefined:
      requiredQuery = `
            SELECT
                *
            FROM 
                todo
            WHERE
                category = '${category}';`;
      break;
    default:
      requiredQuery = `
            SELECT
                *
            FROM 
                todo
            WHERE
                todo LIKE '%${search_q}%';`;
      break;
  }
  const filteredTodo = await db.all(requiredQuery);
  response.send(
    filteredTodo.map((eachTodo) => sqlObjectToResponseObject(eachTodo))
  );
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const specificQuery = `
        SELECT
            *
        FROM 
            todo
        WHERE 
            id = ${todoId};`;
  const specificTodo = await db.get(specificQuery);
  response.send(sqlObjectToResponseObject(specificTodo));
});

app.get("/agenda/", queryValidation, async (request, response) => {
  const { date } = request.query;
  const specificQuery = `
        SELECT
            *
        FROM 
            todo
        WHERE 
            due_date LIKE '${date}';`;
  const specificDateTodoS = await db.all(specificQuery);
  response.send(
    specificDateTodoS.map((eachTodo) => sqlObjectToResponseObject(eachTodo))
  );
});

app.post("/todos/", bodyValidation, async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  console.log("post api");

  const appendRowQuery = `
        INSERT INTO
            todo(id, todo, priority, status, category, due_date)
        VALUES
        (
            ${id},
            '${todo}',
            '${priority}',
            '${status}',
            '${category}',
            ${dueDate}
        );`;
  await db.run(appendRowQuery);
  response.send("Todo Successfully Added");
});

app.put("/todos/:todoId/", bodyValidation, async (request, response) => {
  const { todoId } = request.params;
  const { status, priority, todo, category, dueDate } = request.body;

  let updateQuery = "";
  let updateColumn = "";

  if (status !== undefined) {
    updateColumn = "Status";
    updateQuery = `
        UPDATE
            todo
        SET
            status = '${status}'
        WHERE 
            id = ${todoId};`;
  } else if (priority !== undefined) {
    updateColumn = "Priority";
    updateQuery = `
        UPDATE
            todo
        SET
            priority = '${priority}'
        WHERE 
            id = ${todoId};`;
  } else if (todo !== undefined) {
    updateColumn = "Todo";
    updateQuery = `
        UPDATE
            todo
        SET
            todo = '${todo}'
        WHERE 
            id = ${todoId};`;
  } else if (category !== undefined) {
    updateColumn = "Category";
    updateQuery = `
        UPDATE
            todo
        SET
            category = '${category}'
        WHERE 
            id = ${todoId};`;
  } else if (dueDate !== undefined) {
    updateQuery = `
        UPDATE
            todo
        SET
            due_date = '${dueDate}'
        WHERE 
            id = ${todoId};`;

    updateColumn = "Due Date";
  }
  await db.run(updateQuery);
  response.send(`${updateColumn} Updated`);
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteQuery = `
        DELETE FROM 
            todo
        WHERE 
            id = ${todoId};`;
  await db.run(deleteQuery);
  response.send("Todo Deleted");
});

module.exports = app;
