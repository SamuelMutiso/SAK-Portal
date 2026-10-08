import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import eventsReducer from "./slices/eventsSlice";
import noticesReducer from "./slices/noticesSlice";
import studentsReducer from "./slices/studentsSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    notices: noticesReducer,
    students: studentsReducer,
    events: eventsReducer,
  },
});

export default store;
