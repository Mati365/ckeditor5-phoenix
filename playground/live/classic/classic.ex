defmodule Playground.Live.Classic do
  @moduledoc """
  HTML module for the classic editor page of the playground application.
  """

  use Playground, :live_view
  use CKEditor5

  @impl true
  def mount(_params, _session, socket) do
    {:ok, assign(socket, editor_value: "Hello World!", editor_focused?: false)}
  end

  @impl true
  def handle_event("ckeditor5:change", %{"data" => data}, socket) do
    {:noreply, assign(socket, editor_value: data["main"])}
  end

  def handle_event("ckeditor5:focus", _, socket) do
    {:noreply, assign(socket, editor_focused?: true)}
  end

  def handle_event("ckeditor5:blur", %{"data" => data}, socket) do
    {:noreply, assign(socket, editor_value: data["main"], editor_focused?: false)}
  end

  def handle_event("set_data", _, socket) do
    new_data = "<p>New content set at #{DateTime.utc_now() |> DateTime.to_string()}</p>"

    {:noreply,
     socket
     |> push_event("ckeditor5:set-data", %{editorId: "editor", data: new_data})}
  end
end
