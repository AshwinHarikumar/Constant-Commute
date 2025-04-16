import NotificationsIcon from '@mui/icons-material/Notifications';
import { AppBar, Button, Container, Dialog, DialogActions, DialogContent, Grid, IconButton, Paper, Toolbar, Typography } from '@mui/material';
import { styled } from '@mui/system';
import { DirectionsRenderer, GoogleMap, Marker, useLoadScript } from '@react-google-maps/api';
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
  height: 180px;
  width: 300px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0px 8px 20px rgba(0, 0, 0, 0.2);
  }
`;

const schoolLocation = { lat: 12.935242, lng: 77.624481 }; // example school coordinates
const haversineDistance = (loc1, loc2) => {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371; // Earth's radius in km
  const dLat = toRad(loc2.lat - loc1.lat);
  const dLon = toRad(loc2.lng - loc1.lng);
  const lat1 = toRad(loc1.lat);
  const lat2 = toRad(loc2.lat);
  const a = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const calculateETA = (busLoc) => {
  if (!busLoc) return { hours: 0, minutes: 0 };
  const distance = haversineDistance(busLoc, schoolLocation);
  const averageSpeed = 40; // km per hour
  const timeHours = distance / averageSpeed;
  const hours = Math.floor(timeHours);
  const minutes = Math.round((timeHours - hours) * 60);
  return { hours, minutes };
};

const DriverDashboard = ({ onLogout }) => {
  const [assignedBus, setAssignedBus] = useState(null);
  const [assignedBusId, setAssignedBusId] = useState(null);
  const [busStopsForBus, setBusStopsForBus] = useState([]);
  const [busStopsDialogOpen, setBusStopsDialogOpen] = useState(false);
  const [busStatus, setBusStatus] = useState("");
  const [busLocation, setBusLocation] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("Driver");
  const [viewMapDialogOpen, setViewMapDialogOpen] = useState(false);
  const [directions, setDirections] = useState(null);
  const destination = { lat: 10.269571779583082, lng: 76.40028590252011 };
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: "AIzaSyDiiwr2ckCrgs7MRM5JT6qtRrQlWduVV5w"
  });
  const mapContainerStyle = { height: '500px', width: '100%' };

  // Fetch driver profile and assigned bus
  useEffect(() => {
    const fetchDriverData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.id) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('name, bus_id')
          .eq('id', user.id)
          .single();
        if (!profileError && profile) {
          setUserName(profile.name);
          if (profile.bus_id) {
            setAssignedBusId(profile.bus_id);
            const { data: busData, error: busError } = await supabase
              .from('bus_locations')
              .select('nickname, latitude, longitude, status')
              .eq('id', profile.bus_id)
              .single();
            if (!busError && busData) {
              setAssignedBus(busData.nickname || `Bus ${profile.bus_id}`);
              setBusLocation({ latitude: busData.latitude, longitude: busData.longitude });
              // Set default status "Running" if undefined or null
              if (!busData.status) {
                await supabase
                  .from('bus_locations')
                  .update({ status: "Running" })
                  .eq('id', profile.bus_id);
                setBusStatus("Running");
              } else {
                setBusStatus(busData.status);
              }
            }
          }
        }
      }
    };
    fetchDriverData();
  }, []);

  // Continually update driver's current location
  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setDriverLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting driver location:", error.message);
        },
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  // Update bus location in bus_locations table
  const updateLocation = async () => {
    if (!driverLocation) {
      alert("Current location not available.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from('bus_locations')
        .upsert({
          id: assignedBusId ? assignedBusId : 'driver-bus-id', // use assignedBusId
          latitude: parseFloat(driverLocation.latitude),
          longitude: parseFloat(driverLocation.longitude),
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
      // alert("Bus location updated successfully!");
      setBusLocation({
        latitude: parseFloat(driverLocation.latitude),
        longitude: parseFloat(driverLocation.longitude)
      });
    } catch (error) {
      console.error("Failed to update location:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // Automatically update bus location every 3 seconds when driver location & assigned bus are available
  useEffect(() => {
    if (assignedBusId && driverLocation) {
      const interval = setInterval(() => {
        updateLocation();
      }, 7000);
      return () => clearInterval(interval);
    }
  }, [assignedBusId, driverLocation]);

  // Fetch bus stops for assigned bus
  const fetchBusStopsForBus = async () => {
    if (assignedBusId) {
      const { data, error } = await supabase
        .from('bus_stops')
        .select('*')
        .eq('bus_id', assignedBusId);
      if (error) console.error("Failed to fetch bus stops:", error.message);
      else setBusStopsForBus(data);
    }
  };

  // Add computed center for bus stops map
  // Update bus status
  const updateBusStatus = async (status) => {
    try {
      const { error } = await supabase
        .from('bus_locations')
        .update({ status })
        .eq('id', assignedBusId);
      if (error) throw error;
      setBusStatus(status);
      // If status is "Running Late", send notifications to all students assigned to this bus
      if (status === "Running Late") {
        const eta = calculateETA(busLocation);
        const message = `Bus is running late. ETA: ${eta.hours > 0 ? `${eta.hours} h ` : ''}${eta.minutes} minutes.`;
        const { data: students, error: studentError } = await supabase
          .from('profiles')
          .select('id')
          .eq('bus_id', assignedBusId)
          .eq('role', 'student');
        if (!studentError && students) {
          for (const student of students) {
            await supabase
              .from('notifications')
              .insert([{ message, created_at: new Date().toISOString(), user_id: student.id }]);
          }
        }
      }
      alert("Bus status updated successfully!");
    } catch (error) {
      console.error("Failed to update bus status:", error.message);
    }
  };

  // Function to plot navigation including bus stops as waypoints on the already open Bus Stops dialog
  const plotNavigation = () => {
    if (!busLocation) {
      alert("Bus location not available.");
      return;
    }
    const service = new window.google.maps.DirectionsService();
    const waypoints = busStopsForBus.map(stop => ({
      location: { lat: parseFloat(stop.latitude), lng: parseFloat(stop.longitude) },
      stopover: true
    }));
    service.route({
      origin: { lat: busLocation.latitude, lng: busLocation.longitude },
      destination: destination,
      waypoints: waypoints,
      travelMode: window.google.maps.TravelMode.DRIVING
    }, (result, status) => {
      if (status === window.google.maps.DirectionsStatus.OK) {
        setDirections(result);
      } else {
        console.error(`Failed to fetch directions: ${result}`);
        alert("Failed to calculate route.");
      }
    });
  };

  // Clear the navigation route to show only bus stops markers.
  const clearNavigation = () => {
    setDirections(null);
  };

  // New: Function to plot driving route with traffic data
  const plotDrivingRoute = () => {
    if (!busLocation) {
      alert("Bus location not available.");
      return;
    }
    const service = new window.google.maps.DirectionsService();
    service.route({
      origin: { lat: busLocation.latitude, lng: busLocation.longitude },
      destination: destination,
      travelMode: window.google.maps.TravelMode.DRIVING,
      drivingOptions: {
        departureTime: new Date(),
        trafficModel: 'optimistic' // changed value
      }
    }, (result, status) => {
      console.log("Driving route status:", status, result); // debug log
      if (status === 'OK') {
        setDirections(result);
      } else {
        console.error(`Failed to fetch driving directions: ${result}`);
        alert("Failed to calculate driving route.");
      }
    });
  };

  // Compute center for bus stops or fallback to bus location.
  const busStopsCenter = busStopsForBus.length > 0 
    ? { lat: parseFloat(busStopsForBus[0].latitude), lng: parseFloat(busStopsForBus[0].longitude) }
    : busLocation 
      ? { lat: busLocation.latitude, lng: busLocation.longitude }
      : { lat: 0, lng: 0 };

  return (
    <Container>
      <AppBar position="fixed" style={{ backgroundColor: '#4a47a3' }}>
        <Toolbar>
          <Typography variant="h6" style={{ flexGrow: 1, color: '#ffffff' }}>
            Driver Dashboard
          </Typography>
          <IconButton color="inherit">
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
              {assignedBus ? `Assigned Bus: ${assignedBus}` : 'No assigned bus'}
            </Typography>
          </StyledCard>
        </Grid>
        <Grid item>
          <StyledCard>
            <Typography variant="h6">Current Bus Location</Typography>
            {busLocation ? (
              <Typography>
                Lat: {busLocation.latitude}, Lng: {busLocation.longitude}
              </Typography>
            ) : (
              <Typography>No location available.</Typography>
            )}
          </StyledCard>
        </Grid>
        <Grid item>
          <StyledCard>
            <Typography variant="h6">Update My Location</Typography>
            <Button 
              variant="contained" 
              style={{ backgroundColor: '#4a47a3', color: '#fff', marginTop: '10px' }}
              onClick={updateLocation}
              disabled={loading || !driverLocation || !assignedBus}
            >
              {loading ? 'Updating...' : 'Update My Location'}
            </Button>
            {driverLocation && (
              <Typography variant="body2" style={{ marginTop: '8px' }}>
                Current: {driverLocation.latitude}, {driverLocation.longitude}
              </Typography>
            )}
          </StyledCard>
        </Grid>
        <Grid item>
          <StyledCard>
            <Typography variant="h6">View Bus on Map</Typography>
            <Button
              variant="contained"
              style={{ marginTop: '10px', backgroundColor: '#4a47a3', color: '#fff' }}
              onClick={() => {
                if (busLocation) {
                  setViewMapDialogOpen(true);
                }
              }}
              disabled={!busLocation}
            >
              View Map
            </Button>
          </StyledCard>
        </Grid>
        <Grid item>
          <StyledCard onClick={() => { fetchBusStopsForBus(); setBusStopsDialogOpen(true); }} style={{ cursor: 'pointer' }}>
            <Typography variant="h6">View Bus Stops & Navigation</Typography>
          </StyledCard>
        </Grid>
      </CardContainer>

      <Grid item xs={12}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '16px' }}>
          <Button variant="contained" color="primary" onClick={() => updateBusStatus("Running")}>
            Running
          </Button>
          <Button variant="contained" color="primary" onClick={() => updateBusStatus("Not Running")}>
            Not Running
          </Button>
          <Button variant="contained" color="primary" onClick={() => updateBusStatus("Running Late")}>
            Running Late
          </Button>
        </div>
      </Grid>

      <Dialog open={viewMapDialogOpen} onClose={() => setViewMapDialogOpen(false)} fullWidth maxWidth="lg">
        <DialogContent>
          {loadError ? (
            <div>Error loading map</div>
          ) : isLoaded && busLocation ? (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={{ lat: busLocation.latitude, lng: busLocation.longitude }}
              zoom={14}
            >
              <Marker position={{ lat: busLocation.latitude, lng: busLocation.longitude }} />
            </GoogleMap>
          ) : (
            <div>Loading Map...</div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewMapDialogOpen(false)} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={busStopsDialogOpen}
        onClose={() => { setBusStopsDialogOpen(false); setDirections(null); }}
        fullWidth
        maxWidth="lg"
      >
        <DialogContent>
          <Typography variant="h5" style={{ marginBottom: '20px' }}>
            Bus Stops for Assigned Bus
          </Typography>
          {/* If a driving route was computed (traffic-based), display its ETA */}
          {directions && directions.routes[0].legs[0].duration_in_traffic && (
            <Typography variant="h6" style={{ marginBottom: '10px' }}>
              Estimated Time: {directions.routes[0].legs[0].duration_in_traffic.text}
            </Typography>
          )}
          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={{ height: '400px', width: '100%', margin: '20px 0' }}
              center={busStopsCenter}
              zoom={12}
            >
              {busStopsForBus.map(stop => (
                <Marker
                  key={stop.id}
                  position={{ lat: parseFloat(stop.latitude), lng: parseFloat(stop.longitude) }}
                />
              ))}
              {/* Overlay navigation if computed */}
              {directions && <DirectionsRenderer directions={directions} />}
            </GoogleMap>
          ) : (
            <Typography>
              {busStopsForBus.length === 0 ? "No stops found." : "Loading map..."}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={plotNavigation} color="primary">
            Plot Navigation
          </Button>
          <Button onClick={plotDrivingRoute} color="primary">
            Start Driving
          </Button>
          {directions && (
            <Button onClick={clearNavigation} color="primary">
              Clear Navigation
            </Button>
          )}
          <Button onClick={() => { setBusStopsDialogOpen(false); setDirections(null); }} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DriverDashboard;
