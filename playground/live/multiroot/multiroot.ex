defmodule Playground.Live.Multiroot do
  @moduledoc """
  LiveView module for demonstrating the multiroot editor configuration in the playground application.
  This module allows users to manage multiple root elements in a CKEditor 5 instance, including adding and removing roots dynamically.
  """

  use Playground, :live_view
  use CKEditor5

  @impl true
  def mount(_params, _session, socket) do
    {:ok,
     assign(socket,
       roots: [
         %{id: "header", value: "<h1>Main Header</h1>"},
         %{id: "content", value: "<p>Main content area</p>"}
       ],
       new_root_name: ""
     )}
  end

  @impl true
  def handle_event("add_root", %{"root_name" => name}, socket) do
    id = if String.trim(name) == "", do: "root_#{System.unique_integer([:positive])}", else: name
    new_root = %{id: id, value: "<p>New root: #{id}</p>"}

    {:noreply, assign(socket, roots: socket.assigns.roots ++ [new_root], new_root_name: "")}
  end

  @impl true
  def handle_event("remove_root", %{"id" => id}, socket) do
    updated_roots = Enum.reject(socket.assigns.roots, &(&1.id == id))
    {:noreply, assign(socket, roots: updated_roots)}
  end

  @impl true
  def handle_event("update_new_root_name", %{"root_name" => name}, socket) do
    {:noreply, assign(socket, new_root_name: name)}
  end

  @impl true
  def handle_event("ckeditor5:change", %{"data" => data}, socket) do
    updated_roots =
      Enum.map(socket.assigns.roots, fn root ->
        if Map.has_key?(data, root.id) do
          %{root | value: data[root.id]}
        else
          root
        end
      end)

    {:noreply, assign(socket, roots: updated_roots)}
  end
end
