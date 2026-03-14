(function () {
  var copyButtons = document.querySelectorAll("[data-copy]");
  for (var i = 0; i < copyButtons.length; i += 1) {
    copyButtons[i].addEventListener("click", function (event) {
      var button = event.currentTarget;
      var selector = button.getAttribute("data-copy");
      if (!selector) return;

      var source = document.querySelector(selector);
      if (!source) return;

      var text = source.textContent || "";
      var original = button.textContent;

      function setLabel(label) {
        button.textContent = label;
        window.setTimeout(function () {
          button.textContent = original || "Copy";
        }, 1200);
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
          .writeText(text)
          .then(function () {
            setLabel("Copied");
          })
          .catch(function () {
            setLabel("Failed");
          });
      } else {
        var temp = document.createElement("textarea");
        temp.value = text;
        temp.style.position = "fixed";
        temp.style.opacity = "0";
        document.body.appendChild(temp);
        temp.select();
        try {
          document.execCommand("copy");
          setLabel("Copied");
        } catch (err) {
          setLabel("Failed");
        }
        document.body.removeChild(temp);
      }
    });
  }

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();