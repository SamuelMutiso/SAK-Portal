import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api, { errorMessage } from "../../api/client";

export const fetchNotices = createAsyncThunk("notices/fetch", async () => {
  const { data } = await api.get("/notices");
  return data;
});

export const createNotice = createAsyncThunk("notices/create", async (notice, { rejectWithValue }) => {
  try {
    const { data } = await api.post("/notices", notice);
    return data;
  } catch (error) {
    return rejectWithValue(errorMessage(error));
  }
});

export const deleteNotice = createAsyncThunk("notices/delete", async (id) => {
  await api.delete(`/notices/${id}`);
  return id;
});

const noticesSlice = createSlice({
  name: "notices",
  initialState: { items: [], status: "idle", error: null, lastSms: null },
  reducers: {
    clearSms(state) {
      state.lastSms = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotices.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchNotices.fulfilled, (state, action) => {
        state.status = "idle";
        state.items = action.payload;
      })
      .addCase(createNotice.pending, (state) => {
        state.error = null;
      })
      .addCase(createNotice.fulfilled, (state, action) => {
        state.items.unshift(action.payload.notice);
        state.lastSms = action.payload.sms;
      })
      .addCase(createNotice.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(deleteNotice.fulfilled, (state, action) => {
        state.items = state.items.filter((notice) => notice.id !== action.payload);
      });
  },
});

export const { clearSms } = noticesSlice.actions;
export default noticesSlice.reducer;
