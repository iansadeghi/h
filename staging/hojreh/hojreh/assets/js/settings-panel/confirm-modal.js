const confirmModal = document.getElementById('confirmModal');
const confirmTitle = document.getElementById('confirmTitle');
const confirmDesc = document.getElementById('confirmDesc');
const btnConfirmCancel = document.getElementById('btnConfirmCancel');
const btnConfirmDelete = document.getElementById('btnConfirmDelete');
function showConfirmModal(title, description, onConfirmCallback) {
  if (!confirmModal) return;
  confirmTitle.textContent = title;
  confirmDesc.textContent = description;
  confirmModal.classList.add('active');
  const cancelAction = () => {
    confirmModal.classList.remove('active');
    btnConfirmDelete.onclick = null;
    btnConfirmCancel.onclick = null;
  };
  btnConfirmCancel.onclick = cancelAction;
  btnConfirmDelete.onclick = () => {
    onConfirmCallback();
    cancelAction();
  };
}
export { showConfirmModal };
