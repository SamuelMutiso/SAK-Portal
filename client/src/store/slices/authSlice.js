import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api, { errorMessage } from "../../api/client";

export const login = createAsyncThunk("auth/login", async (credentials, { rejectWithValue }) => {
  try {
    const { data } = await api.post("/auth/login", credentials);
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    localStorage.setItem("user", JSON.stringify(data.user));
    return data.user;
  } catch (error) {
    return rejectWithValue(errorMessage(error));
  }
});

function savedUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

const authSlice = createSlice({
  name: "auth",
  initialState: { user: savedUser(), status: "idle", error: null },
  reducers: {
    consentAccepted(state) {
      state.user = { ...state.user, consent_required: false };
      localStorage.setItem("user", JSON.stringify(state.user));
    },
    logout(state) {
      localStorage.clear();
      state.user = null;
      state.status = "idle";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = "idle";
        state.user = action.payload;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = "idle";
        state.error = action.payload;
      });
  },
});

export const { consentAccepted, logout } = authSlice.actions;
export default authSlice.reducer;
