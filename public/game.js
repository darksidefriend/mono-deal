const socket = io();

socket.on("modal", data => {
  document.getElementById("modalText").innerText = data.message;
  document.getElementById("modal").classList.remove("hidden");
});

function confirmNo() {
  socket.emit("use_no", { roomId, cardId: "no-card-id" });
  closeModal();
}

function closeModal() {
  document.getElementById("modal").classList.add("hidden");
}

function endTurn() {
  socket.emit("end_turn", { roomId });
}