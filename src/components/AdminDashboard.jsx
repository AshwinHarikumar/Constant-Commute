import NotificationsIcon from '@mui/icons-material/Notifications';
import {
  AppBar,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import { styled } from '@mui/system';
import { GoogleMap, InfoWindow, Marker, useLoadScript } from '@react-google-maps/api';
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

// Styled Components
const CardContainer = styled(Grid)`
  display: flex;
  justify-content: center;
  align-items: stretch;
  gap: 20px;
  margin-top: 20px;
  flex-wrap: wrap;
`;

const StyledCard = styled(Paper)`
  padding: 20px;
  text-align: center;
  border-radius: 12px;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
  background-color: #ffffff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 150px;
  width: 300px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0px 8px 20px rgba(0, 0, 0, 0.2);
  }
`;

const CardTitle = styled(Typography)`
  font-weight: bold;
  color: #4a47a3;
  margin-bottom: 10px;
`;

const CardContent = styled(Typography)`
  color: #666;
  font-size: 1rem;
`;

const AdminDashboard = ({ onLogout }) => {
  // State Management
  const [users, setUsers] = useState([]);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewUsersDialogOpen, setViewUsersDialogOpen] = useState(false);
  const [viewBusesDialogOpen, setViewBusesDialogOpen] = useState(false);
  const [viewMapDialogOpen, setViewMapDialogOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 12.971598, lng: 77.594566 }); // Add mapCenter state
  const [editingRole, setEditingRole] = useState({});
  const [selectedBus, setSelectedBus] = useState(null);
  const [notification, setNotification] = useState('');
  const [sendingNotification, setSendingNotification] = useState(false);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [roleCounts, setRoleCounts] = useState({ admin: 0, driver: 0, student: 0 });
  const [loggedInUsers, setLoggedInUsers] = useState(0);
  const [userLocation, setUserLocation] = useState({ lat: 12.971598, lng: 77.594566 });
  const [busNicknames, setBusNicknames] = useState({});
  const [studentCounts, setStudentCounts] = useState({});
  const [newStop, setNewStop] = useState({ name: '', latitude: '', longitude: '' }); // add state for new stop
  const [selectedBusForDetails, setSelectedBusForDetails] = useState(null);
  const [busStopsForBus, setBusStopsForBus] = useState([]);
  const [newStopForBus, setNewStopForBus] = useState({ name: '', stop_time: '', latitude: '', longitude: '' });

  // Load google maps once using useLoadScript hook
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: "AIzaSyDiiwr2ckCrgs7MRM5JT6qtRrQlWduVV5w",
  });

  const handleViewMapDialogOpen = () => {
    setViewMapDialogOpen(true);
    // Reset mapCenter when the dialog is opened to force a re-render
    setMapCenter(userLocation);
  };

  const handleViewMapDialogClose = () => {
    setViewMapDialogOpen(false);
  };

  useEffect(() => {
    // Update mapCenter when userLocation changes
    setMapCenter(userLocation);
  }, [userLocation]);

  // Fetch Users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;

      setUsers(data);

      // Count users by role
      const counts = { admin: 0, driver: 0, student: 0 };
      data.forEach((user) => {
        if (counts[user.role] !== undefined) counts[user.role]++;
      });
      setRoleCounts(counts);

      // Set logged in users deterministically
      setLoggedInUsers(data.length);

    } catch (error) {
      console.error('Failed to fetch users:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Buses
  const fetchBuses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('bus_locations').select('*');
      if (error) throw error;

      setBuses(data);
    } catch (error) {
      console.error('Failed to fetch buses:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Student Counts
  const fetchStudentCounts = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('bus_id, count(*)')
        .group('bus_id');

      if (error) throw error;

      const counts = {};
      data.forEach((item) => {
        counts[item.bus_id] = item.count;
      });
      setStudentCounts(counts);
    } catch (error) {
      console.error('Failed to fetch student counts:', error.message);
    }
  };

  // Fetch Bus Stops for a specific bus
  const fetchBusStopsForBus = async (busId) => {
    try {
      const { data, error } = await supabase.from('bus_stops').select('*').eq('bus_id', busId);
      if (error) throw error;
      setBusStopsForBus(data);
    } catch (error) {
      console.error("Failed to fetch bus stops for bus:", error.message);
    }
  };

  // Update User Role
  const updateUserRole = async (id, role) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', id);

      if (error) throw error;

      setUsers((prevUsers) =>
        prevUsers.map((user) => (user.id === id ? { ...user, role } : user))
      );
      setEditingRole((prev) => ({ ...prev, [id]: false }));
    } catch (error) {
      console.error('Failed to update role:', error.message);
    }
  };

  // Update User Bus
  const updateUserBus = async (id, busId) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ bus_id: busId || null })
        .eq('id', id);

      if (error) throw error;

      setUsers((prevUsers) =>
        prevUsers.map((user) => (user.id === id ? { ...user, bus_id: busId || null } : user))
      );
      await fetchStudentCounts();
    } catch (error) {
      console.error('Failed to assign bus:', error.message);
    }
  };

  // Update Bus Nickname
  const updateBusNickname = async (busId, nickname) => {
    try {
      const { error } = await supabase
        .from('bus_locations')
        .update({ nickname })
        .eq('id', busId);

      if (error) throw error;

      setBusNicknames((prev) => ({ ...prev, [busId]: nickname }));
    } catch (error) {
      console.error('Failed to update bus nickname:', error.message);
    }
  };

  // Assign User to Bus
  const assignUserToBus = async (userId, busId) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ bus_id: busId || null })
        .eq('id', userId);

      if (error) throw error;

      setUsers((prevUsers) =>
        prevUsers.map((user) => (user.id === userId ? { ...user, bus_id: busId || null } : user))
      );
      await fetchStudentCounts();
    } catch (error) {
      console.error('Failed to assign user to bus:', error.message);
    }
  };

  // Unassign User from Bus
  const unassignUserFromBus = async (userId) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ bus_id: null })
        .eq('id', userId);

      if (error) throw error;

      setUsers((prevUsers) =>
        prevUsers.map((user) => (user.id === userId ? { ...user, bus_id: null } : user))
      );
      await fetchStudentCounts();
    } catch (error) {
      console.error('Failed to unassign user from bus:', error.message);
    }
  };

  // Send Notification
  const sendNotification = async () => {
    if (!notification.trim()) {
      alert('Notification message cannot be empty.');
      return;
    }

    setSendingNotification(true);
    try {
      const { error } = await supabase
        .from('notifications')
        .insert([{ message: notification, created_at: new Date().toISOString() }]);

      if (error) throw error;

      alert('Notification sent successfully!');
      setNotification('');
      setNotificationDialogOpen(false);
    } catch (error) {
      console.error('Failed to send notification:', error.message);
    } finally {
      setSendingNotification(false);
    }
  };

  // Add Bus Stop
  const addBusStop = async () => {
    if (!newStop.name || !newStop.latitude || !newStop.longitude) {
      alert('All fields required');
      return;
    }
    try {
      const { error } = await supabase.from('bus_stops').insert([
        { 
          name: newStop.name, 
          latitude: parseFloat(newStop.latitude), 
          longitude: parseFloat(newStop.longitude) 
        }
      ]);
      if (error) throw error;
      alert('Bus stop added successfully!');
      setNewStop({ name: '', latitude: '', longitude: '' });
      // Optionally refetch bus stops if listing them
    } catch (error) {
      console.error('Failed to add bus stop:', error.message);
    }
  };

  // Add Bus Stop for a specific bus
  const addBusStopForBus = async () => {
    if (!newStopForBus.name || !newStopForBus.stop_time || !newStopForBus.latitude || !newStopForBus.longitude) {
      alert('All fields required');
      return;
    }
    if (!selectedBusForDetails) {
      alert('No bus selected');
      return;
    }
    try {
      const { error } = await supabase.from('bus_stops').insert([
        {
          bus_id: selectedBusForDetails.id,
          name: newStopForBus.name,
          stop_time: newStopForBus.stop_time,
          latitude: parseFloat(newStopForBus.latitude),
          longitude: parseFloat(newStopForBus.longitude)
        }
      ]);
      if (error) throw error;
      alert('Bus stop added successfully!');
      setNewStopForBus({ name: '', stop_time: '', latitude: '', longitude: '' });
      fetchBusStopsForBus(selectedBusForDetails.id);
    } catch (error) {
      console.error('Failed to add bus stop:', error.message);
    }
  };

  // Open Bus Details
  const openBusDetails = (bus) => {
    setSelectedBusForDetails(bus);
    fetchBusStopsForBus(bus.id);
  };

  // Fetch Data on Mount
  useEffect(() => {
    fetchUsers();
    fetchStudentCounts();
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Buses When Dialogs Open
  useEffect(() => {
    if (viewBusesDialogOpen || viewMapDialogOpen) fetchBuses();
  }, [viewBusesDialogOpen, viewMapDialogOpen]);

  // Get User Location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error fetching user location:', error.message);
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser.');
    }
  }, []);

  // Map Container Style
  const mapContainerStyle = {
    height: '500px',
    width: '100%',
  };

  return (
    <div style={{ backgroundColor: '#f4f4f9', minHeight: '100vh', padding: '20px' }}>
      {/* Top Navigation Bar */}
      <AppBar position="fixed" style={{ backgroundColor: '#4a47a3', zIndex: 1201 }}>
        <Toolbar>
          <Typography variant="h6" style={{ flexGrow: 1, fontWeight: 'bold', color: '#ffffff' }}>
            Admin Dashboard
          </Typography>
          <IconButton
            color="inherit"
            onClick={() => setNotificationDialogOpen(true)}
            style={{ marginRight: '10px' }}
          >
            <NotificationsIcon />
          </IconButton>
          <Button color="inherit" onClick={onLogout} style={{ fontWeight: 'bold' }}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container style={{ marginTop: '80px' }}>
        {/* Cards Section */}
        <CardContainer container spacing={4}>
          {/* Current Time Card */}
          <Grid item>
            <StyledCard>
              <CardTitle variant="h6">Current Time</CardTitle>
              <CardContent>{currentTime.toLocaleTimeString()}</CardContent>
            </StyledCard>
          </Grid>

          {/* Logged-In Users Card */}
          <Grid item>
            <StyledCard>
              <CardTitle variant="h6"> Total Users</CardTitle>
              <CardContent>{loggedInUsers}</CardContent>
            </StyledCard>
          </Grid>

          {/* Total Users by Role Card */}
          <Grid item>
            <StyledCard>
              <CardTitle variant="h6">Users by Role</CardTitle>
              <CardContent>Admins: {roleCounts.admin}</CardContent>
              <CardContent>Drivers: {roleCounts.driver}</CardContent>
              <CardContent>Students: {roleCounts.student}</CardContent>
            </StyledCard>
          </Grid>

          {/* Manage Users Card */}
          <Grid item>
            <StyledCard>
              <CardTitle variant="h6">Manage Users</CardTitle>
              <CardContent>View and manage all registered users.</CardContent>
              <Button
                variant="contained"
                style={{
                  marginTop: '12px',
                  backgroundColor: '#4a47a3',
                  color: '#fff',
                  fontWeight: 'bold',
                  textTransform: 'none',
                }}
                onClick={() => setViewUsersDialogOpen(true)}
              >
                View Users
              </Button>
            </StyledCard>
          </Grid>

          {/* System Settings Card */}
          <Grid item>
            <StyledCard>
              <CardTitle variant="h6">System Settings</CardTitle>
              <CardContent>View and manage bus details.</CardContent>
              <Button
                variant="contained"
                style={{
                  marginTop: '15px',
                  backgroundColor: '#4a47a3',
                  color: '#fff',
                  fontWeight: 'bold',
                  textTransform: 'none',
                }}
                onClick={() => setViewBusesDialogOpen(true)}
              >
                View Bus Details
              </Button>
            </StyledCard>
          </Grid>

          {/* View Bus Locations Card */}
          <Grid item>
            <StyledCard>
              <CardTitle variant="h6">View Bus Locations</CardTitle>
              <CardContent>View bus locations on a map.</CardContent>
              <Button
                variant="contained"
                style={{
                  marginTop: '15px',
                  backgroundColor: '#4a47a3',
                  color: '#fff',
                  fontWeight: 'bold',
                  textTransform: 'none',
                }}
                onClick={handleViewMapDialogOpen}
              >
                View Map
              </Button>
            </StyledCard>
          </Grid>
        </CardContainer>
      </Container>

      {/* Notification Dialog */}
      <Dialog
        open={notificationDialogOpen}
        onClose={() => setNotificationDialogOpen(false)}
        slotProps={{
          paper: {
            style: {
              borderRadius: '12px',
              padding: '30px',
              width: '400px',
              maxWidth: '90%',
              backgroundColor: '#ffffff',
              boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.2)',
            },
          },
        }}
      >
        <Paper style={{ textAlign: 'center', backgroundColor: 'transparent', boxShadow: 'none' }}>
          <Typography variant="h5" style={{ fontWeight: 'bold', color: '#4a47a3', marginBottom: '8px' }}>
            📢 Send Notification
          </Typography>
          <Typography variant="body2" style={{ color: '#555', marginBottom: '20px' }}>
            Notify all students with an important message.
          </Typography>

          <TextField
            label="Notification Message"
            variant="outlined"
            fullWidth
            multiline
            rows={4}
            value={notification}
            onChange={(e) => setNotification(e.target.value)}
            style={{ marginBottom: '20px' }}
          />

          <DialogActions style={{ justifyContent: 'center' }}>
            <Button
              onClick={() => setNotificationDialogOpen(false)}
              variant="outlined"
              color="secondary"
              style={{ borderRadius: '8px', padding: '8px 20px', fontWeight: '600' }}
            >
              Cancel
            </Button>
            <Button
              onClick={sendNotification}
              color="primary"
              variant="contained"
              disabled={sendingNotification}
              style={{ borderRadius: '8px', padding: '8px 20px', fontWeight: '600' }}
            >
              {sendingNotification ? 'Sending...' : 'Send'}
            </Button>
          </DialogActions>
        </Paper>
      </Dialog>

      {/* View Users Dialog */}
      <Dialog
        open={viewUsersDialogOpen}
        onClose={() => setViewUsersDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogContent>
          <Typography variant="h6" style={{ fontWeight: 'bold', color: '#4a47a3', marginBottom: '20px' }}>
            Registered Users
          </Typography>
          {loading ? (
            <Typography variant="body2" style={{ color: '#666', marginBottom: '20px' }}>
              Loading users...
            </Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>ID</strong></TableCell>
                    <TableCell><strong>Name</strong></TableCell>
                    <TableCell><strong>Email</strong></TableCell>
                    <TableCell><strong>Role</strong></TableCell>
                    <TableCell><strong>Bus</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.id}</TableCell>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {editingRole[user.id] ? (
                          <Select
                            value={user.role}
                            onChange={(e) => updateUserRole(user.id, e.target.value)}
                            style={{ width: '100%' }}
                          >
                            <MenuItem value="admin">Admin</MenuItem>
                            <MenuItem value="driver">Driver</MenuItem>
                            <MenuItem value="student">Student</MenuItem>
                          </Select>
                        ) : (
                          user.role
                        )}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const assignedBus = buses.find((bus) => bus.id === user.bus_id);
                          return assignedBus
                            ? assignedBus.nickname || `Bus ${assignedBus.id}`
                            : 'None';
                        })()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="contained"
                          color="secondary"
                          style={{ marginRight: '10px', marginBottom: '5px' }}
                          onClick={() => deleteUser(user.id)}
                        >
                          Delete
                        </Button>
                        <Button
                          variant="contained"
                          style={{
                            backgroundColor: '#4a47a3',
                            color: '#fff',
                            marginBottom: '5px',
                          }}
                          onClick={() =>
                            setEditingRole((prev) => ({ ...prev, [user.id]: !prev[user.id] }))
                          }
                        >
                          {editingRole[user.id] ? 'Save Role' : 'Edit Role'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
      </Dialog>

      {/* View Bus Details Dialog */}
      <Dialog
        open={viewBusesDialogOpen}
        onClose={() => setViewBusesDialogOpen(false)}
        fullWidth
        maxWidth="100px"
      >
        <DialogContent>
          <Typography variant="h6" style={{ fontWeight: 'bold', color: '#4a47a3', marginBottom: '15px' }}>
            Bus Details
          </Typography>
          {loading ? (
            <Typography variant="body2" style={{ color: '#666' }}>
              Loading bus details...
            </Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>ID</strong></TableCell>
                    <TableCell><strong>Nickname</strong></TableCell>
                    <TableCell><strong>Latitude</strong></TableCell>
                    <TableCell><strong>Longitude</strong></TableCell>
                    <TableCell><strong>Last Updated</strong></TableCell>
                    <TableCell><strong>Students Assigned</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {buses.map((bus) => (
                    <TableRow key={bus.id}>
                      <TableCell>{bus.id}</TableCell>
                      <TableCell>
                        <TextField
                          value={busNicknames[bus.id] || bus.nickname || ''}
                          onChange={(e) =>
                            setBusNicknames((prev) => ({
                              ...prev,
                              [bus.id]: e.target.value,
                            }))
                          }
                          onBlur={() =>
                            updateBusNickname(bus.id, busNicknames[bus.id] || '')
                          }
                          placeholder="Set nickname"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{bus.latitude}</TableCell>
                      <TableCell>{bus.longitude}</TableCell>
                      <TableCell>{new Date(bus.updated_at).toLocaleString()}</TableCell>
                      <TableCell>
                        <Typography variant="body2" style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                          Assign Students
                        </Typography>
                        <Select
                          value=""
                          onChange={(e) => assignUserToBus(e.target.value, bus.id)}
                          style={{ width: '100%', marginBottom: '10px' }}
                        >
                          <MenuItem value="">Select Student</MenuItem>
                          {users
                            .filter((user) => user.role === 'student' && user.bus_id !== bus.id)
                            .map((student) => (
                              <MenuItem key={student.id} value={student.id}>
                                {student.name} ({student.email})
                              </MenuItem>
                            ))}
                        </Select>

                        <Typography variant="body2" style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                          Assign Drivers
                        </Typography>
                        <Select
                          value=""
                          onChange={(e) => assignUserToBus(e.target.value, bus.id)}
                          style={{ width: '100%', marginBottom: '10px' }}
                        >
                          <MenuItem value="">Select Driver</MenuItem>
                          {users
                            .filter((user) => user.role === 'driver' && user.bus_id !== bus.id)
                            .map((driver) => (
                              <MenuItem key={driver.id} value={driver.id}>
                                {driver.name} ({driver.email})
                              </MenuItem>
                            ))}
                        </Select>

                        <Typography variant="body2" style={{ fontWeight: 'bold', marginTop: '16px', marginBottom: '8px' }}>
                          Assigned Students:
                        </Typography>
                        {users
                          .filter((user) => user.role === 'student' && user.bus_id === bus.id)
                          .map((student) => (
                            <Paper key={student.id} style={{ padding: '8px', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>{student.name} ({student.email})</span>
                              <Button
                                variant="outlined"
                                color="secondary"
                                size="small"
                                onClick={() => unassignUserFromBus(student.id)}
                              >
                                Unassign
                              </Button>
                            </Paper>
                          ))}

                        <Typography variant="body2" style={{ fontWeight: 'bold', marginTop: '16px', marginBottom: '8px' }}>
                          Assigned Drivers:
                        </Typography>
                        {users
                          .filter((user) => user.role === 'driver' && user.bus_id === bus.id)
                          .map((driver) => (
                            <Paper key={driver.id} style={{ padding: '8px', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>{driver.name} ({driver.email})</span>
                              <Button
                                variant="outlined"
                                color="secondary"
                                size="small"
                                onClick={() => unassignUserFromBus(driver.id)}
                              >
                                Unassign
                              </Button>
                            </Paper>
                          ))}
                      </TableCell>
                      <TableCell>
                        <Button variant="contained" onClick={() => openBusDetails(bus)}>
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
      </Dialog>

      {/* View Map Dialog */}
      <Dialog
        open={viewMapDialogOpen}
        onClose={handleViewMapDialogClose}
        fullWidth
        maxWidth="lg"
      >
        <DialogContent>
          <Typography variant="h6" style={{ fontWeight: 'bold', color: '#4a47a3', marginBottom: '15px' }}>
            Bus Locations Map
          </Typography>
          {loadError ? (
            <div>Error loading maps</div>
          ) : isLoaded ? (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={mapCenter}
              zoom={12}
              key={mapCenter.lat + ',' + mapCenter.lng} // force re-render when mapCenter changes
            >
              {buses.map((bus) => (
                <Marker
                  key={bus.id}
                  position={{ lat: bus.latitude, lng: bus.longitude }}
                  onClick={() => setSelectedBus(bus)}
                />
              ))}
              {selectedBus && (
                <InfoWindow
                  position={{ lat: selectedBus.latitude, lng: selectedBus.longitude }}
                  onCloseClick={() => setSelectedBus(null)}
                >
                  <div>
                    <strong>Bus ID:</strong> {selectedBus.id}
                    <br />
                    <strong>Latitude:</strong> {selectedBus.latitude}
                    <br />
                    <strong>Longitude:</strong> {selectedBus.longitude}
                    <br />
                    <strong>Last Updated:</strong> {new Date(selectedBus.updated_at).toLocaleString()}
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          ) : (
            <div>Loading Map...</div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bus Details Dialog */}
      <Dialog
        open={Boolean(selectedBusForDetails)}
        onClose={() => setSelectedBusForDetails(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogContent>
          <Typography variant="h6" style={{ marginBottom: '16px' }}>
            Bus {selectedBusForDetails?.nickname || selectedBusForDetails?.id} Details
          </Typography>
          <Typography variant="subtitle1">Bus Stops</Typography>
          {busStopsForBus.length > 0 ? (
            busStopsForBus.map((stop) => (
              <Typography key={stop.id}>
                {stop.name} ({stop.stop_time}) — {stop.latitude}, {stop.longitude}
              </Typography>
            ))
          ) : (
            <Typography>No stops for this bus.</Typography>
          )}
          <Typography variant="subtitle1" style={{ marginTop: '16px' }}></Typography>
            Add New Stop
          <TextField
            label="Stop Name"
            variant="outlined"
            value={newStopForBus.name}
            onChange={(e) => setNewStopForBus(prev => ({ ...prev, name: e.target.value }))}
            fullWidth
            style={{ marginBottom: '8px' }}
          />
          <TextField
            label="Stop Time"
            variant="outlined"
            value={newStopForBus.stop_time}
            onChange={(e) => setNewStopForBus(prev => ({ ...prev, stop_time: e.target.value }))}
            fullWidth
            style={{ marginBottom: '8px' }}
          />
          <TextField
            label="Latitude"
            variant="outlined"
            value={newStopForBus.latitude}
            onChange={(e) => setNewStopForBus(prev => ({ ...prev, latitude: e.target.value }))}
            fullWidth
            style={{ marginBottom: '8px' }}
          />
          <TextField
            label="Longitude"
            variant="outlined"
            value={newStopForBus.longitude}
            onChange={(e) => setNewStopForBus(prev => ({ ...prev, longitude: e.target.value }))}
            fullWidth
            style={{ marginBottom: '8px' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedBusForDetails(null)} color="secondary">
            Close
          </Button>
          <Button onClick={addBusStopForBus} color="primary" variant="contained">
            Add Stop
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;