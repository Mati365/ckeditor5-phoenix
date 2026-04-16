defmodule Playground.Live.Context do
  @moduledoc """
  HTML module for the context page of the playground application.
  """

  use Playground, :live_view
  use CKEditor5

  @impl true
  def mount(_params, _session, socket) do
    {:ok,
     assign(socket,
       new_editor_name: "",
       editors: [
         %{id: "first", value: "<h1>Main Header</h1>"},
         %{id: "second", value: "<p>Main content area</p>"}
       ]
     )}
  end

  @impl true
  def handle_event("add_editor", %{"editor_name" => name}, socket) do
    id =
      if String.trim(name) == "", do: "editor_#{System.unique_integer([:positive])}", else: name

    new_editor = %{id: id, value: "<p>New editor: #{id}</p>"}

    {:noreply,
     assign(socket, editors: socket.assigns.editors ++ [new_editor], new_editor_name: "")}
  end

  @impl true
  def handle_event("clear_editors", _params, socket) do
    cleared_roots =
      Enum.map(socket.assigns.editors, fn editor ->
        %{editor | value: ""}
      end)

    {:noreply, assign(socket, editors: cleared_roots)}
  end

  @impl true
  def handle_event("remove_editor", %{"id" => id}, socket) do
    updated_editors = Enum.reject(socket.assigns.editors, &(&1.id == id))

    {:noreply, assign(socket, editors: updated_editors)}
  end

  @impl true
  def handle_event("update_new_editor_name", %{"editor_name" => name}, socket) do
    {:noreply, assign(socket, new_editor_name: name)}
  end
end
