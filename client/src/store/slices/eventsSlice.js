import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api, { errorMessage } from "../../api/client";

export const fetchEvents = createAsyncThunk("events/fetch", async () => {
  const { data } = await api.get("/events");
  return data;
});

export const createEvent = createAsyncThunk("events/create", async (event, { rejectWithValue }) => {
  try {
    const { data } = await api.post("/events", event);
    return data;
  } catch (error) {
    return rejectWithValue(errorMessage(error));
  }
});

export const deleteEvent = createAsyncThunk("events/delete", async (id) => {
  await api.delete(`/events/${id}`);
  return id;
});

const eventsSlice = createSlice({
  name: "events",
  initialState: { items: [], status: "idle", error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEvents.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchEvents.fulfilled, (state, action) => {
        state.status = "idle";
        state.items = action.payload;
      })
      .addCase(createEvent.fulfilled, (state, action) => {
        state.error = null;
        state.items.push(action.payload);
        state.items.sort((a, b) => a.start_date.localeCompare(b.start_date));
      })
      .addCase(createEvent.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(deleteEvent.fulfilled, (state, action) => {
        state.items = state.items.filter((event) => event.id !== action.payload);
      });
  },
});

export default eventsSlice.reducer;
