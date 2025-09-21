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
  


