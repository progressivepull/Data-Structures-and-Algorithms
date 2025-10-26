$( document ).ready(function() {


  $("#calculateChildren").click(function() {

      const index = parseInt(document.getElementById('parentIndex').value);
      if (isNaN(index) || index < 0) {
        document.getElementById('output').innerText = "Please enter a valid non-negative index.";
        return;
      }

      const left = 2 * index + 1;
      const right = 2 * index + 2;

      document.getElementById('output').innerHTML = `
        <p>For parent index <strong>${index}</strong>:</p>
        <ul>
          <li>Left child index: <strong>${left}</strong></li>
          <li>Right child index: <strong>${right}</strong></li>
        </ul>
      `;
    });

});