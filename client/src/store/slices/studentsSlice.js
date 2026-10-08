import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../api/client";

export const fetchStudents = createAsyncThunk("students/fetch", async (params = {}) => {
  const { data } = await api.get("/students", { params });
  return data;
});

const studentsSlice = createSlice({
  name: "students",
  initialState: { items: [], status: "idle" },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStudents.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchStudents.fulfilled, (state, action) => {
        state.status = "idle";
        state.items = action.payload;
      });
  },
});

export default studentsSlice.reducer;
