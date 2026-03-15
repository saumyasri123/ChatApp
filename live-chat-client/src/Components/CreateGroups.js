import React, { useState, useContext } from "react";
import DoneOutlineRoundedIcon from "@mui/icons-material/DoneOutlineRounded";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
  } from "@mui/material";
  import { useSelector } from "react-redux";
  import axios from "axios";
  import { useNavigate } from "react-router-dom";
  import { myContext } from "./MainContainer";

function CreateGroups() {
    const lightTheme = useSelector((state) => state.themeKey);
    const userData = JSON.parse(localStorage.getItem("userData"));
    const nav = useNavigate();
    if (!userData) {
      console.log("User not Authenticated");
      nav("/");
    }
    const user = userData.data;
    const { refresh, setRefresh } = useContext(myContext);
    const [groupName, setGroupName] = useState("");
    const [open, setOpen] = React.useState(false);
  
    const handleClickOpen = () => {
      setOpen(true);
    };
  
    const handleClose = () => {
      setOpen(false);
    };
  
    const createGroup = () => {
      if (!groupName.trim()) return;
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      // Only pass the current logged-in user as initial member (no stale hardcoded IDs)
      axios.post(
        "http://localhost:8080/chat/createGroup",
        {
          name: groupName,
          users: JSON.stringify([user._id]),
        },
        config
      ).then(() => {
        setRefresh(!refresh);
        nav("/app/groups");
      }).catch((err) => {
        console.error("Create group failed:", err?.response?.data?.message || err.message);
        alert("Failed to create group. Please try again.");
      });
    };

    return (
        <>
          <div>
            <Dialog
              open={open}
              onClose={handleClose}
              aria-labelledby="alert-dialog-title"
              aria-describedby="alert-dialog-description"
            >
              <DialogTitle id="alert-dialog-title">
                {"Do you want to create a Group Named " + groupName}
              </DialogTitle>
              <DialogContent>
                <DialogContentText id="alert-dialog-description">
                  This will create a group in which you will be the admin and
                  others will be able to join this group.
                </DialogContentText>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleClose}>Disagree</Button>
                <Button
                  onClick={() => {
                    createGroup();
                    handleClose();
                  }}
                  autoFocus
                >
                  Agree
                </Button>
              </DialogActions>
            </Dialog>
          </div>
          <div className={"createGroups-container" + (lightTheme ? "" : " dark")}>
            <input
              placeholder="Enter Group Name"
              className={"search-box" + (lightTheme ? "" : " dark")}
              onChange={(e) => {
                setGroupName(e.target.value);
              }}
            />
            <IconButton
              className={"icon" + (lightTheme ? "" : " dark")}
              onClick={() => {
                if (groupName.trim()) {
                  handleClickOpen();
                }
              }}
            >
              <DoneOutlineRoundedIcon />
            </IconButton>
          </div>
        </>
    );
}

export default CreateGroups;