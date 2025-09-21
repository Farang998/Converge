## **Use Cases and Scenarios**

**1. Use Case: Login / Register**

**Goal:**
The user wants to log in to the system if they already have an account, or register as a new user to start using the platform.

**Actors:**
Team Member, Team Leader, Freelancer

**Preconditions:**
* The user has access to the platform.
* If logging in, the user already has a registered account.
* If registering, the user must have a valid email ID.

**Postconditions:**
* The user is successfully logged in and taken to their dashboard.
* The system grants access based on the user's role (Team Leader, Team Member, or Freelancer).

**Main Flow:**
1.  The user navigates to the login/register page.
2.  The user selects either **Login** or **Register**.

    **Login**<br>
      **3a.** The user enters their email/username and password.<br>
      **4a.** The system validates the credentials.<br>
      **5a.** If the credentials are correct, the system logs the user in.

    **Register**<br>
      **3b.** The user completes the registration form with their name, email, password, and role.<br>
      **4b.** The system checks the details for validity.<br>
      **5b.** If the details are valid, the system creates the new user account.

3.  After successful login or registration, the user is redirected to their personalized dashboard.

**Exception Flows:**
* **Incorrect Credentials:** If login credentials are incorrect, the system displays an error message and prompts the user to try again.
* **No Account on Login:** If a user attempts to log in without an account, the system suggests they register.
* **Already Registered Email:** If a user tries to register with an email that's already in use, the system notifies them and suggests they log in instead.
* **System/Network Issue:** If the login or registration process fails due to a server/network issue, an error message appears, and the user is asked to try again later.

---

**2. Use Case: Create Project**

**Goal:**
The user (Team Leader or Freelancer) wants to create a new project workspace to organize tasks, files, and communication for the team.

**Actors:**
Team Leader, Freelancer

**Preconditions:**
* The user is logged into the system.
* The user has permission to create a project (Team Leaders always can; Freelancers only if allowed by the system or client).

**Postconditions:**
* A new project workspace is created in the system.
* The creator (Team Leader/Freelancer) becomes the owner/admin of that workspace.
* An invitation link is generated to add other team members.

**Main Flow:**
1. The user logs into the system and navigates to the dashboard.
2. The user clicks on “Create New Project.”
3. The user enters the project details, including the project name, description, start date, and deadline.
4. The user sets roles and permissions for potential team members.
5. The user confirms the creation of the project.
6. The system creates the project workspace and generates a unique invitation link.
7. The system displays the new project dashboard, allowing the creator to start adding tasks and inviting members.

**Exception Flows:**
* **Missing Information:** If the user doesn't fill in required fields (like the project name), the system shows an error and prompts them to complete the form.
* **Duplicate Project Name:** If the project name already exists, the system displays an error and suggests a different name.
* **System/Network Error:** If the system fails to create the project due to a server or network issue, an error message appears, and the user is asked to try again later.

---

**3. Use Case: Add/Remove Team Members**

**Goal:**
The Team Leader wants to add new members to the project workspace or remove existing members if needed.

**Actors:**
Team Leader

**Preconditions:**
* The Team Leader is logged into the system.
* A project workspace has already been created.
* For adding: The Team Leader has an invitation link ready to send.
* For removing: The member to be removed is already part of the workspace.

**Postconditions:**
* If adding, the invited Team Member successfully joins the workspace and can access tasks, files, and chat.
* If removing, the selected Team Member is no longer part of the workspace and cannot access its data.

**Main Flow:**

  **Add Member**
  1. The Team Leader navigates to the project workspace.
  2. The Team Leader goes to the “Members” section and selects “Add Member.”
  3. The system generates a unique invitation link.
  4. The Team Leader sends the link to the new Team Member (via email or messaging).
  5. The Team Member accepts the invitation link, logs in, and is automatically added to the workspace.

  **Remove Member**
  1. The Team Leader opens the project workspace.
  2. The Team Leader goes to the “Members” section and selects the "Remove Member" option for the desired member.
  3. The system asks for confirmation of removal.
  4. Upon confirmation, the member is immediately removed and loses all access to the workspace.

**Exception Flows:**
* **Invalid Invitation Link:** If the invitation link is expired or invalid, the system displays an error and prompts the Team Leader to generate a new link.
* **Member Already Exists:** If the invited person is already a member of the workspace, the system notifies the Team Leader that no action is needed.
* **Unauthorized Removal:** If the Team Leader tries to remove themselves or another team leader, the system shows an error and prevents the action.
* **System/Network Error:** If a system or network failure occurs during the add/remove process, an error message appears, and the user is asked to try again later.

---

**4. Use Case: Personalized Chatbot**

**Goal:**
The user interacts with an AI-powered chatbot to get quick suggestions, reminders, or answers to queries related to the project or system.

**Actors:**
Individual User (Team Member, Team Leader, Freelancer)

**Preconditions:**
* The user is logged into the system.
* The chatbot service is active and available.

**Postconditions:**
* The user receives relevant responses from the chatbot.
* The chatbot may provide suggestions, reminders, or direct the user to the right module (like tasks, files, or calendar).

**Main Flow:**
1. The user opens the chatbot from the workspace dashboard.
2. The user types a question or request.
3. The chatbot processes the input using its AI engine.
4. The chatbot fetches relevant information from the system, such as tasks or project data.
5. The chatbot replies with a response, like a task list, a reminder confirmation, or a helpful suggestion.

**Exception Flows:**
* **Unrecognized Query:** If the chatbot doesn't understand the question, it asks the user to rephrase or suggests related options.
* **No Data Found:** If the user asks for information that doesn’t exist, the chatbot informs them.
* **System Error:** If the chatbot cannot fetch data due to a system or server issue, it displays an error and asks the user to try again later.
* **Limited Permissions:** If the user requests an action outside of their role's permissions (e.g., a team member asking to remove a member), the chatbot explains that the action is not allowed.
  
---

**5. Use Case: Join Project Workspace**  

**Goal:**  
Team member wants to join the project workspace to start collaboration.  

**Actors:**  
Team Member  

**Preconditions:**  
* Team member is logged into the system.  
* Team leader has already created a project and sent an invitation link.  

**Postconditions:**  
* Team member has access to the project workspace, including tasks, files, and chat.  
* Team leader can see that the team member successfully joined the workspace.  

**Main Flow:**  
1. Team Leader creates a new project workspace and sends an invitation link to the Team Member.  
2. Team Member receives the link via email or internal message.  
3. Team Member clicks the invitation link.  
4. Team Member logs into the platform (if not already logged in).  
5. System authenticates the user and validates the invitation link.  
6. Team Member is added to the project workspace.  
7. The workspace dashboard opens, showing tasks, files, and chat.  

**Exception Flows:**  
* **Invalid/Expired Invitation Link:** If the invitation link is invalid or expired, the system shows an error message and suggests requesting a new link.  
* **User Not Authenticated:** If the team member is not logged in, the system redirects them to the login page before proceeding.  
* **Already Joined:** If the team member has already joined the workspace, the system notifies them and directly opens the workspace.  
* **System/Network Error:** If the system fails to add the member due to a server/network issue, an error message appears, and the user is asked to try again later.

---

**6. Use Case: Assign Task to Team Member**  

**Goal:**  
Team leader wants to assign a task to a specific team member to track project progress.  

**Actors:**  
Team Leader  

**Preconditions:**  
* Team leader is logged into the system.  
* A project workspace is already created.  
* Team member has joined the project.  

**Postconditions:**  
* Task is assigned and appears in the team member's task dashboard.  
* Notification is sent to the assigned team member.  

**Main Flow:**  
1. Team Leader logs into the system and opens the project workspace.  
2. Navigates to the 'Tasks' tab.  
3. Clicks **Create Task** and fills in task name, description, deadline, and assignee.  
4. Selects a specific Team Member from the dropdown.  
5. Clicks **Assign.**  
6. Team Member receives a notification that a new task has been assigned.  
7. Task appears in the Team Member’s dashboard.  

**Exception Flows:**  
* **Team Member Not Found:** If the selected member is not part of the project, the system shows an error message.  
* **Missing Details:** If task details (name, deadline) are not filled, the system prompts the user to complete all fields.  
* **System Error:** If the task cannot be created due to a backend error, the system displays an error message.

---

**7. Use Case: Submit Work**  

**Goal:**  
Team member wants to submit completed work for review and approval.  

**Actors:**  
Team member 

**Preconditions:**  
* Team member is logged into the system.  
* Task has been accepted and marked as **In Progress.**  

**Postconditions:**  
* File is uploaded and submitted file is visible to the team leader.  
* Status of task changes to **Submitted** or **Under Review.**  

**Main Flow:**  
1. Team member logs into the platform.  
2. Opens the assigned task from the **Tasks** tab.  
3. Completes the work outside or within the platform tools.  
4. Returns to the task and clicks **Upload file here.**  
5. Selects the relevant file and adds a comment like *"Please review."*  
6. Clicks **Submit.**  
7. System updates the task status to **Submitted** and notifies the Team Leader.  

**Exception Flows:**  
* **File Upload Error:** If the file format or size is invalid, the system shows an error message.  
* **Network/Server Error:** If the system cannot save the file, the user is asked to retry later.  
* **Unauthorized Submission:** If the team member is not the assigned user, submission is blocked.

---

**8. Use Case: Track Task Progress**  

**Goal:**  
Team member wants to update task status and track their progress.  

**Actors:**  
Team Member  

**Preconditions:**  
* Team member is logged into the system.  
* Task has been assigned to them.  

**Postconditions:**  
* Task status is updated (e.g., **In Progress**, **Completed**).  
* Team leader can view the updated progress.  

**Main Flow:**  
1. Team Member logs into the platform.  
2. Opens the assigned project workspace.  
3. Navigates to the **My Tasks** section.  
4. Opens an active task to view details.  
5. Clicks the status dropdown and selects **In Progress.**  
6. After completing the task, updates the status to **Completed.**  
7. Team Leader gets notified of the status change.  

**Exception Flows:**  
* **Unauthorized Update:** If the user tries to update a task not assigned to them, the system blocks the action.  
* **Invalid Status Change:** If the transition is not allowed (e.g., skipping from *Not Started* to *Completed*), an error is shown.  
* **System Error:** If the update fails, the system notifies the user to retry.

---

**9. Use Case: Task Deadline Reminders**  

**Goal:**  
Team member receives timely reminders about upcoming task deadlines to ensure tasks are completed on time. 

**Actors:**  
Team Member  

**Preconditions:**  
* Team member is logged into the system.  
* Team member has assigned tasks with defined deadlines.

**Postconditions:**  
* Team member receives a notification regarding an approaching task deadline. 
* Team member is aware of the remaining time to complete the task.

**Main Flow:**  
1. The System monitors all assigned tasks and their respective deadlines.
2. As a task deadline approaches (e.g., 24 hours before, 12 hours before), the system identifies the relevant team member.
3. The system generates a reminder notification
4. Team member receives the notification through their preferred channel (e.g., in-app, email).
5. Team member views the notification, which includes details of the task and its deadline.

**Exception Flows:**  
* **Task Completed Early:** If the task is marked as complete before the reminder is scheduled, the system cancels the reminder.
* **System/Network Error:** If there is a system or network issue preventing the delivery of the reminder, the system logs the error and attempts to resend the reminder when the issue is resolved.

---

**9. Use Case: Version Control for the Project**  

**Goal:**  
Users can manage and track different versions of project, ensuring changes are recorded, and previous versions can be restored.

**Actors:**  
Team Member, Team Leader

**Preconditions:**  
* Users are logged into the system.  
* Project files are stored within the system's designated file management area.
* Version control is enabled for the project.

**Postconditions:**  
* New versions of files are saved and accessible.
* Users can view the history of changes made to a file.
* Users can revert to a previous version of a file.

**Main Flow:**  
1. Users navigate to the desired project workspace and access the file management section.
2. Users select a file for which they want to manage versions.
3. Users can either upload a new version of an existing file or view the version history.
4. If uploading a new version, the system prompts for a description of the changes.
5. The system saves the new version, incrementing the version number.
6. If viewing version history, the system displays a list of all previous versions, including the date, time, and user who made the changes, along with any change descriptions.
7. Users can select a previous version to view or restore.
8. If restoring, the system replaces the current version with the selected previous version, creating a new entry in the version history.

**Exception Flows:**  
* **7a) No Previous Versions:** If a file has no previous versions, the system informs the user.
* **System/Network Error:** If there is a system or network issue preventing the saving, viewing, or restoring of file versions, an error message appears, and the user is asked to try again later.
* **Conflicting Changes (Manual Resolution):** If the user attempts to save a file with the existing name and type, then the system will ask the user to either cancel upload or overwrite. 
