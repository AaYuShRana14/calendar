import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User, Check,Edit, Trash2, Phone } from 'lucide-react';
import axios from 'axios';

const Home = () => {
  if (!localStorage.getItem('calenderr')) {
    window.location.href = '/login';
  }
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    phone: '',
    date: '',
    time: ''
  });

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimeSlots, setShowTimeSlots] = useState(false);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [error, setError] = useState('');

  const timeSlots = [
    '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
    '15:00', '16:00', '17:00', '18:00', '19:00'
  ];

  const API_BASE_URL = 'https://calendar-rsh9.onrender.com';
  
  useEffect(() => {
    fetchAppointments();
  }, []);

  useEffect(() => {
    const slots = appointments
      .filter(apt => apt.start?.dateTime) 
      .map(apt => {
        const startDateTime = new Date(apt.start.dateTime);
        if (isNaN(startDateTime.getTime())) {
          return null;
        }
        const date = startDateTime.toISOString().split('T')[0];
        const time = startDateTime.toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'Asia/Kolkata'
        });
        return { date, time };
      })
      .filter(slot => slot !== null);
    setBookedSlots(slots);
  }, [appointments]);

  const fetchAppointments = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/event`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('calenderr')}`
        }
      });
      setAppointments(response.data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setAppointments([]);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const validateForm = () => {
    if (!formData.name.trim()) return 'Name is required';
    if (formData.city.toLowerCase() !== 'delhi') return 'Only people from Delhi can take appointments';
    if (!formData.phone.trim()) return 'Phone number is required';
    if (!formData.date) return 'Please select a date';
    if (!formData.time) return 'Please select a time';
    return null;
  };

  const handleSubmit = async () => {
    console.log('Submitting form with data:', formData);
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const requestData = {
        name: formData.name,
        phone: formData.phone,
        date: formData.date,
        time: formData.time
      };

      const config = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('calenderr')}`
        }
      };

      let response;
      if (editingId) {
        response = await axios.put(`${API_BASE_URL}/event/update/${editingId}`, requestData, config);
      } else {
        response = await axios.post(`${API_BASE_URL}/event/create`, requestData, config);
      }

      if (response.status === 200 || response.status === 201) {
        await fetchAppointments();
        setFormData({
          name: '',
          city: '',
          phone: '',
          date: '',
          time: '',
        });

        setEditingId(null);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
      
    } catch (error) {
      console.error('Error saving appointment:', error);
      if (error.response && error.response.data && error.response.data.message) {
        setError(error.response.data.message);
      } else {
        setError('Failed to save appointment. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (appointment) => {
    const name = appointment.summary 
        ? appointment.summary.replace('Meeting with ', '') 
        : '';
    
    const phone = appointment.description 
        ? appointment.description.replace('Phone: ', '') 
        : '';
    
    if (!appointment.start?.dateTime) {
      setError('Invalid appointment data - missing date/time');
      return;
    }
    
    const startDateTime = new Date(appointment.start.dateTime);
    
    if (isNaN(startDateTime.getTime())) {
      setError('Invalid appointment date/time');
      return;
    }
    
    const date = startDateTime.toISOString().split('T')[0];
    const time = startDateTime.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'Asia/Kolkata'
    });
    
    setFormData({
      name: name,
      city: 'Delhi', 
      phone: phone,
      date: date,
      time: time
    });
    setEditingId(appointment.id);
  };

  const handleCancel = async (id) => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      setLoading(true);
      try {
        const response = await axios.delete(`${API_BASE_URL}/event/delete/${id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('calenderr')}`
          }
        });

        if (response.status === 200) {
          await fetchAppointments();
        }
      } catch (error) {
        console.error('Error canceling appointment:', error);
        if (error.response && error.response.data && error.response.data.message) {
          setError(error.response.data.message);
        } else {
          setError('Failed to cancel appointment');
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const getNext7Days = () => {
    const days = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    
    return days;
  };

  const isDateAvailable = (date) => {
    const dayOfWeek = date.getDay();
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  };

  const isTimeSlotAvailable = (date, time) => {
    const dateStr = date.toISOString().split('T')[0];
    return !bookedSlots.some(slot => slot.date === dateStr && slot.time === time);
  };

  const handleDateSelect = (date) => {
    if (!isDateAvailable(date)) return;
    
    const dateStr = date.toISOString().split('T')[0];
    setFormData({ ...formData, date: dateStr, time: '' });
    setShowCalendar(false);
    setShowTimeSlots(true);
  };

  const handleTimeSelect = (time) => {
    setFormData({ ...formData, time });
    setShowTimeSlots(false);
  };

  const getAvailableTimesForDate = (dateStr) => {
    return timeSlots.filter(time => {
      const date = new Date(dateStr);
      return isTimeSlotAvailable(date, time);
    });
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Book Your Appointment</h1>
          <p className="text-gray-600">Schedule your consultation with our experts</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">
                {editingId ? 'Edit Appointment' : 'New Appointment'}
              </h2>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-2" />
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter your full name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-2" />
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Delhi (Only Delhi residents can book)"
                  required
                />
                {formData.city && formData.city.toLowerCase() !== 'delhi' && (
                  <p className="text-red-500 text-sm mt-1">Only people from Delhi can take appointments</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Phone className="w-4 h-4 inline mr-2" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter your phone number"
                  required
                />
              </div>

              {/* Date Selection - Next 7 Days */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Select Date (Next 7 Days)
                </label>
                <button
                  type="button"
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-left"
                >
                  {formData.date ? formatDate(formData.date) : 'Choose a date'}
                </button>

                {/* Date Selection Modal */}
                {showCalendar && (
                  <div className="mt-2 p-4 border border-gray-200 rounded-lg bg-white shadow-lg">
                    <h3 className="font-semibold mb-3">Available Dates (Weekdays Only)</h3>
                    <div className="space-y-2">
                      {getNext7Days().map((date, index) => {
                        const isAvailable = isDateAvailable(date);
                        const dateStr = date.toISOString().split('T')[0];
                        const isSelected = formData.date === dateStr;
                        const isToday = index === 0;

                        return (
                          <button
                            key={dateStr}
                            onClick={() => handleDateSelect(date)}
                            disabled={!isAvailable}
                            className={`w-full p-3 text-left rounded-lg transition-colors ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : isAvailable
                                ? 'hover:bg-blue-100 text-gray-800 border border-gray-200'
                                : 'text-gray-300 cursor-not-allowed bg-gray-50'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-medium">
                                {date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                {isToday && ' (Today)'}
                              </span>
                              {!isAvailable && <span className="text-xs">Weekend</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Time Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-2" />
                  Select Time
                </label>
                <button
                  type="button"
                  onClick={() => formData.date && setShowTimeSlots(!showTimeSlots)}
                  disabled={!formData.date}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-left disabled:bg-gray-50 disabled:cursor-not-allowed"
                >
                  {formData.time || 'Choose a time'}
                </button>

                {/* Time Slots Modal */}
                {showTimeSlots && formData.date && (
                  <div className="mt-2 p-4 border border-gray-200 rounded-lg bg-white shadow-lg">
                    <h3 className="font-semibold mb-3">Available Times</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {getAvailableTimesForDate(formData.date).map(time => (
                        <button
                          key={time}
                          onClick={() => handleTimeSelect(time)}
                          className={`p-2 text-center rounded-lg transition-colors ${
                            formData.time === time
                              ? 'bg-blue-600 text-white'
                              : 'border border-gray-300 hover:bg-blue-50'
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                    {getAvailableTimesForDate(formData.date).length === 0 && (
                      <p className="text-gray-500 text-center py-4">No available times for this date</p>
                    )}
                  </div>
                )}
              </div>
                            
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  editingId ? 'Update Appointment' : 'Book Appointment'
                )}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setFormData({
                      name: '',
                      city: '',
                      phone: '',
                      date: '',
                      time: '',
                    });
                    setError('');
                  }}
                  className="w-full bg-gray-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </div>

          {/* Appointments List */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Your Appointments</h2>
            
            {appointments.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No appointments scheduled yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments
                  .filter(appointment => appointment.start?.dateTime && appointment.end?.dateTime) // Filter valid appointments
                  .map(appointment => {
                    const name = appointment.summary 
                        ? appointment.summary.replace('Meeting with ', '') 
                        : 'Unnamed Appointment';
                    
                    const phone = appointment.description 
                        ? appointment.description.replace('Phone: ', '') 
                        : 'No phone provided';
                    
                    const startDateTime = new Date(appointment.start.dateTime);
                    const endDateTime = new Date(appointment.end.dateTime);
                    
                    // Double-check if dates are valid
                    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
                      return null; // Skip this appointment if dates are invalid
                    }
                    
                    return (
                      <div key={appointment.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-800">{name}</h3>
                            <p className="text-sm text-gray-600">{phone}</p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(appointment)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleCancel(appointment.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex items-center text-sm text-gray-600 mb-2">
                          <Calendar className="w-4 h-4 mr-2" />
                          {startDateTime.toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                        
                        <div className="flex items-center text-sm text-gray-600 mb-2">
                          <Clock className="w-4 h-4 mr-2" />
                          {startDateTime.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          })} - {endDateTime.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          })}
                        </div>
                        
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="w-4 h-4 mr-2" />
                          Delhi
                        </div>
                        
                        <div className="mt-3">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            appointment.status === 'confirmed' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            <Check className="w-3 h-3 mr-1" />
                            {appointment.status ? appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1) : 'Pending'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                  .filter(item => item !== null) 
                }
              </div>
            )}
          </div>
        </div>

        {showSuccess && (
          <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center">
            <Check className="w-5 h-5 mr-2" />
            {editingId ? 'Appointment updated successfully!' : 'Appointment created successfully!'}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;