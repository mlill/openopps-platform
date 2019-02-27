const db = require('../../../db');
const dao = require('./dao')(db);

var service = {};

service.getInternships = async function(userId, state) {
    var results = await dao.Task.db.query(dao.query.internshipListQuery, userId, state);
    return results.rows;
}

service.getInternshipSummary = async function(userId, taskId) {
    var results = await dao.Task.db.query(dao.query.internshipSummaryQuery, userId, taskId);
    return results.rows[0];
}

service.getTaskShareList = async function(userId, taskId) {
    var results = await dao.Task.db.query(dao.query.taskShareQuery, userId, taskId);
    return results.rows;
}

service.getTaskList = async function(userId, taskId) {
    var results = await dao.Task.db.query(dao.query.taskListQuery, taskId);

    if (results.rows.length == 0) {
        var listNames = ['Assigned', 'Interviewing', 'Interviewed', 'Offer out', 'Accepted'];
        for (let i = 0; i < listNames.length; i++) {
            await createTaskList(listNames[i], taskId, userId, i)
        }
        await populateApplicantList(taskId, userId);
        var results = await dao.Task.db.query(dao.query.taskListQuery, taskId);
    }
    for (let i = 0; i < results.rows.length; i++) {
        results.rows[i].applicants = await getApplicants(results.rows[i].task_list_id);
    }
    return results.rows;
}

async function createTaskList(listName, taskId, userId, sortOrder) {
    var list = {
        task_id: taskId,
        title: listName,
        sort_order: sortOrder,
        created_at: new Date(),
        updated_at: new Date(),
        updated_by: userId
    };
    return await dao.TaskList.insert(list);
}

async function populateApplicantList(taskId, userId) {
    var taskList = await dao.TaskList.findOne('task_id = ? and sort_order = 0', taskId);
    var missingApplications = (await dao.TaskListApplication.db.query(dao.query.applicationsNotInListQuery, taskId)).rows;
    for (let i = 0; i < missingApplications.length; i++) {
        await createTaskListApplication(missingApplications[i], taskList.taskListId, userId);
    }
}

async function createTaskListApplication(item, taskListId, userId) {
    var list = {
        task_list_id: taskListId,
        application_id: item.application_id,
        sort_order: item.application_id,
        created_at: new Date(),
        updated_at: new Date(),
        updated_by: userId
    };

    return await dao.TaskListApplication.insert(list);
}

async function getApplicants(task_list_id) {
    var applications = await dao.TaskListApplication.db.query(dao.query.taskListApplicationQuery, task_list_id);
    return applications.rows;
}

module.exports = service;