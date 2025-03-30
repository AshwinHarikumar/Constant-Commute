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
  Paper,
  Toolbar,
  Typography
} from '@mui/material';
import { styled } from '@mui/system';
import { GoogleMap, Marker, useLoadScript } from '@react-google-maps/api';
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

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

const StudentDashboard = ({ onLogout }) => {
  const [notifications, setNotifications] = useState([]);
  const [busLocation, setBusLocation] = useState(null);
  const [selectedStop, setSelectedStop] = useState(null);
  const [viewMapDialogOpen, setViewMapDialogOpen] = useState(false);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [assignedBusNickname, setAssignedBusNickname] = useState(null);
  const [availableBuses, setAvailableBuses] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [busStops, setBusStops] = useState([]); // new state to hold all bus stops
  const [busStopsDialogOpen, setBusStopsDialogOpen] = useState(false); // new state for Bus Stops dialog
  const [selectedStopForMap, setSelectedStopForMap] = useState(null); // New state for displaying a selected stop on map
  const [userName, setUserName] = useState("Student");

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: "AIzaSyDiiwr2ckCrgs7MRM5JT6qtRrQlWduVV5w"
  });

  const haversineDistance = (loc1, loc2) => {
    const toRad = (x) => x * Math.PI / 180;
    const R = 6371; // Earth's radius in km
    const dLat = toRad(loc2.lat - loc1.lat);
    const dLon = toRad(loc2.lng - loc1.lng);
    const lat1 = toRad(loc1.lat);
    const lat2 = toRad(loc2.lat);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // km
  };

  const calculateETA = () => {
    if (!userLocation || !busLocation) return null;
    const distance = haversineDistance(
      userLocation, 
      { lat: parseFloat(busLocation.latitude), lng: parseFloat(busLocation.longitude) }
    );
    const averageSpeed = 40; // km per hour
    const timeHours = distance / averageSpeed;
    const hours = Math.floor(timeHours);
    const minutes = Math.round((timeHours - hours) * 60);
    return { hours, minutes };
  };

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error.message);
    }
  };

  const fetchAssignedBus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.id) {
      console.error('User not authenticated.');
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('bus_id')
      .eq('id', user.id)
      .single();
    if (error) {
      console.error('Failed to fetch assigned bus:', error.message);
      return;
    }

    if (data.bus_id) {
      const { data: busData, error: busError } = await supabase
        .from('bus_locations')
        .select('nickname, latitude, longitude')
        .eq('id', data.bus_id)
        .single();
      if (busError) {
        console.error('Failed to fetch assigned bus:', busError.message);
        return;
      }
      setAssignedBusNickname(busData.nickname || `Bus ${data.bus_id}`);
      setBusLocation({ latitude: busData.latitude, longitude: busData.longitude });
    } else {
      setAssignedBusNickname(null);
      setBusLocation(null);
    }
  };

  const fetchAvailableBuses = async () => {
    try {
      const { data, error } = await supabase
        .from('bus_locations')
        .select('id, nickname');
      if (error) throw error;

      if (data.length === 0) {
        console.warn('No buses found in the bus_locations table.');
      }

      setAvailableBuses(data);
    } catch (error) {
      console.error('Failed to fetch available buses:', error.message);
    }
  };

  const fetchBusLocation = async () => {
    if (!assignedBusNickname) return;
    try {
      const { data, error } = await supabase
        .from('bus_locations')
        .select('latitude, longitude')
        .eq('nickname', assignedBusNickname)
        .single();

      if (error) throw error;
      setBusLocation({
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude)
      });
    } catch (error) {
      console.error('Failed to fetch bus location:', error.message);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchAssignedBus();
    fetchAvailableBuses();
  }, []);

  useEffect(() => {
    fetchBusLocation();
  }, [assignedBusNickname]);

  useEffect(() => {
    if (assignedBusNickname) {
      const interval = setInterval(() => {
        fetchBusLocation();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [assignedBusNickname]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
        (error) => {
          console.error('Error fetching user location:', error.message);
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser.');
    }
  }, []);

  useEffect(() => {
    const fetchBusStops = async () => {
      try {
        const { data, error } = await supabase.from('bus_stops').select('*');
        if (error) throw error;
        setBusStops(data);
      } catch (error) {
        console.error("Failed to fetch bus stops:", error.message);
      }
    };
    fetchBusStops();
  }, []);

  useEffect(() => {
    const fetchUserName = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.id) {
        const { data, error } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single();
        if (!error && data) {
          setUserName(data.name);
        } else {
          console.error('Failed to fetch user name:', error.message);
        }
      }
    };
    fetchUserName();
  }, []);

  useEffect(() => {
    const notificationsChannel = supabase
      .channel('notifications_channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsChannel);
    };
  }, []);

  return (
    <Container>
      <AppBar position="fixed" style={{ backgroundColor: '#4a47a3' }}>
        <Toolbar>
          <Typography variant="h6" style={{ flexGrow: 1, color: '#ffffff' }}>
            Student Dashboard
          </Typography>
          <IconButton color="inherit" onClick={() => setNotificationDialogOpen(true)} style={{ marginRight: '10px' }}>
            <NotificationsIcon />
          </IconButton>
          <Button color="inherit" onClick={onLogout}>Logout</Button>
        </Toolbar>
      </AppBar>

      <Typography variant="h4" style={{ margin: '80px 0 20px', textAlign: 'center', color: '#4a47a3' }}>
        Welcome, {userName}!
      </Typography>

      <CardContainer container spacing={4}>
        <Grid item>
          <StyledCard>
            <Typography variant="h6">
              {assignedBusNickname ? `Assigned Bus: ${assignedBusNickname}` : 'No assigned bus'}
            </Typography>
          </StyledCard>
        </Grid>
        <Grid item>
          <StyledCard>
            <Typography variant="h6">Bus Location</Typography>
            {busLocation ? (
              <Typography>
                Latitude: {busLocation.latitude}, Longitude: {busLocation.longitude}
              </Typography>
            ) : (
              <Typography>No bus assigned yet.</Typography>
            )}
            <Button
              variant="contained"
              style={{ marginTop: '10px', backgroundColor: '#4a47a3', color: '#fff' }}
              onClick={() => setViewMapDialogOpen(true)}
              disabled={!busLocation}
            >
              View on Map
            </Button>
          </StyledCard>
        </Grid>
        <Grid item>
          <StyledCard>
            <Typography variant="h6">Estimated Time of Arrival</Typography>
            {userLocation && busLocation ? (
              (() => {
                const eta = calculateETA();
                return eta 
                  ? <Typography>ETA: {eta.hours > 0 ? `${eta.hours} h ` : ''}{eta.minutes} minutes</Typography>
                  : <Typography>ETA not available</Typography>;
              })()
            ) : (
              <Typography>ETA not available</Typography>
            )}
          </StyledCard>
        </Grid>
        <Grid item>
          <StyledCard onClick={() => setBusStopsDialogOpen(true)} style={{ cursor: 'pointer' }}>
            <Typography variant="h6">Bus Stops</Typography>
            {busStops.length > 0 ? (
              <>
                {busStops.slice(0, 3).map((stop, index) => (
                  <Typography key={stop.id} variant="body2" style={{ marginTop: index === 0 ? '8px' : '4px' }}>
                    {index + 1}. {stop.name}
                  </Typography>
                ))}
                {busStops.length > 3 && (
                  <Typography variant="body2" style={{ marginTop: '4px', fontStyle: 'italic' }}>
                    View All
                  </Typography>
                )}
              </>
            ) : (
              <Typography>No stops available.</Typography>
            )}
          </StyledCard>
        </Grid>
      </CardContainer>

      <Dialog 
        open={notificationDialogOpen} 
        onClose={() => setNotificationDialogOpen(false)} 
        fullWidth 
        maxWidth="sm"
      >
        <DialogContent>
          <Typography variant="h6" style={{ marginBottom: '16px' }}>
            Notifications
          </Typography>
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <Typography key={notification.id} style={{ marginBottom: '8px' }}>
                {notification.message}
              </Typography>
            ))
          ) : (
            <Typography>No notifications available.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotificationDialogOpen(false)} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={viewMapDialogOpen} onClose={() => setViewMapDialogOpen(false)} fullWidth maxWidth="lg">
        <DialogContent>
          { loadError ? (
              <div>Error loading map</div>
            ) : isLoaded ? (
              <GoogleMap
                mapContainerStyle={{ height: '500px', width: '100%' }}
                center={
                  busLocation && !isNaN(busLocation.latitude) && !isNaN(busLocation.longitude)
                    ? { lat: busLocation.latitude, lng: busLocation.longitude }
                    : { lat: 0, lng: 0 }
                }
                zoom={14}
              >
                {busLocation && (
                  <Marker position={{ lat: busLocation.latitude, lng: busLocation.longitude }} />
                )}
              </GoogleMap>
            ) : (
              <div>Loading Map...</div>
            )
          }
        </DialogContent>
      </Dialog>

      <Dialog
        open={busStopsDialogOpen}
        onClose={() => setBusStopsDialogOpen(false)}
        fullWidth
        maxWidth="lg"
      >
        <DialogContent>
          <Typography variant="h5" style={{ marginBottom: '20px' }}>
            Bus Stops
          </Typography>
          {busStops.length > 0 ? (
            busStops.map((stop, index) => (
              <div key={stop.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <Typography style={{ flexGrow: 1 }}>
                  {index + 1}. {stop.name} – {stop.stop_time}
                </Typography>
                <Button variant="outlined" size="small" onClick={() => { setSelectedStopForMap(stop); }}>
                  View on Map
                </Button>
              </div>
            ))
          ) : (
            <Typography>No stops available.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBusStopsDialogOpen(false)} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(selectedStopForMap)}
        onClose={() => setSelectedStopForMap(null)}
        fullWidth
        maxWidth="lg"
      >
        <DialogContent>
          <Typography variant="h6" style={{ marginBottom: '10px' }}>
            {selectedStopForMap?.name} – {selectedStopForMap?.stop_time}
          </Typography>
          {selectedStopForMap && (
            <GoogleMap
              mapContainerStyle={{ height: '500px', width: '100%' }}
              center={{ lat: parseFloat(selectedStopForMap.latitude), lng: parseFloat(selectedStopForMap.longitude) }}
              zoom={16}
            >
              <Marker position={{ lat: parseFloat(selectedStopForMap.latitude), lng: parseFloat(selectedStopForMap.longitude) }} />
            </GoogleMap>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedStopForMap(null)} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default StudentDashboard;