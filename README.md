# Constant Commute

Constant Commute is a MERN-based real-time application designed for managing bus operations including driver and student dashboards, administrative management, and live bus tracking using Google Maps API integrated with Supabase for backend services.

## Technologies Used
- **React** – Frontend framework for building user interfaces.
- **Material-UI (MUI)** – For UI components and styling.
- **Google Maps API** – For map and location functionalities.
- **Supabase** – Backend as a Service (PostgreSQL, authentication, real-time subscriptions).
- **JavaScript (ES6+) and JSX** – Programming language and syntax.

## Functionalities
- **Driver Dashboard**:  
  - Automatically updates the bus location every few seconds using geolocation.
  - Allows drivers to update their bus status (Running, Not Running, Running Late).
  - Sends real-time notifications to students when the bus status is "Running Late" with an ETA calculation.
- **Student Dashboard**:  
  - Displays assigned bus details and live bus location on a map.
  - Shows the estimated time of arrival (ETA) at the school.
  - Renders real-time notifications and bus stops for the assigned bus.
- **Admin Dashboard**:  
  - Allows management of users and buses.
  - Displays various statistics such as the number of users by role.
  - Provides functionalities to update user roles, assign/unassign buses, and manage bus stops.
  - Provides a real-time map to track all bus locations.
- **Notifications**:  
  - Utilizes Supabase real-time subscriptions to update students’ dashboards as notifications are sent.

## How to Start the Project

1. **Clone the repository:**
   ```bash
   git clone <repository_url>
   ```

2. **Install dependencies:**
   Navigate to the project directory and install npm packages:
   npm install
   ```

3. **Set up Supabase:**
   - Create a Supabase project.
   - Configure authentication, database tables (`profiles`, `bus_locations`, `bus_stops`, and `notifications`).
   - Update the Supabase connection in `supabaseClient.js` with your Supabase URL and Anon Key.

4. **Configure Google Maps API:**
   - Obtain a Google Maps API key.
   - Replace the API key in the `useLoadScript` hook in your components with your actual key.

5. **Run the Project:**
   Start the development server:
   npm start
   ```
   The project will then be available at `http://localhost:3000`.

6. **Build the Project:**
   For production, run:
   npm run build
   ```

## Project Structure
- **src/components**: Contains all React components including dashboards for Driver, Student, and Admin.
- **src/supabaseClient.js**: Initializes and exports the Supabase client.
- **public/**: Contains the static files.
- **README.md**: Provides information on the project as described.

Enjoy using Constant Commute for efficient and real-time bus management!
