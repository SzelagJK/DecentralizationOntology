> **Prototype disclaimer**
>
> The following implementation is a research prototype supplied as a supporting artifact for the paper titled **“Defining Decentralization: An Ontological Perspective.”** Rather than a production ready software. Results should be checked against the definitions and propositions in the paper.

# Decentralization Ontology Sandbox

A standalone browser tool for constructing, importing, simulating, evaluating, and comparing graph representations of computer communication systems. It implements the paper's subject-specific ontology together with the Void Tolerance and Imperviousness metrics.

## Run the application

Open the following file in a modern browser:

```text
dist/decentralization-ontology-sandbox.html
```

The distributed file contains its HTML, CSS, and JavaScript in one document. It requires no server, package installation, or network connection.

To rebuild the standalone file from source, run from this directory:

```bash
node build.mjs
```

## Model

A system topology is represented as a finite simple undirected graph

$$
G_t=(V,E), \qquad n=|V|, \qquad m=|E|.
$$

The graph canvas stores a unique identifier and square-plane coordinates for each vertex, plus unordered endpoint pairs for edges. Coordinates control only the drawing; all evaluation uses the adjacency structure of $G_t$.

For each subject $u$, the model stores a positive realization count $c_u(v)$ at every supporting vertex. It derives

$$
V_u=\{v\in V:c_u(v)>0\}, \qquad
\lambda(p_u)=|V_u|, \qquad
\delta(p_u)=\sum_{v\in V_u}c_u(v).
$$

- $\lambda(p_u)$ is the number of distinct supporting vertices.
- $\delta(p_u)$ is the number of subject realizations.
- Multiple realizations may occupy the same vertex, so $1\leq\lambda(p_u)\leq\delta(p_u)$.
- $\epsilon_u>0$ is the subject-specific sensitivity factor used by both metrics.

Before evaluation, the implementation rejects missing or duplicate identifiers, invalid edge endpoints, self-loops, duplicate edges, empty subject supports, invalid realization counts, $\sum_vc_u(v)\neq\delta(p_u)$, $\lambda(p_u)>\delta(p_u)$, and non-positive $\epsilon_u$.

## Void Tolerance

The implementation performs one iterative Tarjan low-link traversal over the **full topology** $G_t$. This produces a depth-first-search forest, connected-component identifiers, subtree sizes, low-link values, and all articulation vertices in $O(n+m)$ time.

An articulation vertex is a vertex whose removal increases the number of connected components. Tarjan's test for a non-root DFS vertex $v$ and child $w$ is

$$
\operatorname{low}(w)\geq\operatorname{disc}(v).
$$

A DFS root is an articulation vertex when it has more than one DFS child. Vertex and neighbour order may change the DFS tree, but not the resulting articulation set.

Subjects are applied after the structural traversal. Only articulation vertices that support the evaluated subject are eligible:

$$
A_u=A(G_t)\cap V_u,
\qquad
r_v(u)=|A_u|.
$$

Importantly, the component isolated by removing $v\in A_u$ is **not required to contain another subject-supporting vertex**. The removed vertex must belong to $V_u$; the structural separation is evaluated over the full topology. This follows the current implementation and the paper's worked blockchain example.

For each $v\in A_u$, let $\mathcal C_v$ contain the components of $G_t-v$. The reference component is selected lexicographically:

$$
C_v^\star\in
\operatorname*{arg\,max}_{C\in\mathcal C_v}^{\mathrm{lex}}
\left(|C\cap(V_u\setminus\{v\})|,|C|\right).
$$

This first maximizes the number of remaining subject-supporting vertices and uses total component order only to break a tie. All other components form the isolated portion:

$$
g_u(v)=\sum_{C\in\mathcal C_v\setminus\{C_v^\star\}}|C|
=n-1-|C_v^\star|,
$$

and the implementation retains the largest such effect:

$$
|G_s(u)|=
\begin{cases}
0,&A_u=\varnothing,\\
\max_{v\in A_u}g_u(v),&\text{otherwise}.
\end{cases}
$$

Void Tolerance is evaluated as

$$
T_L(u)=
\begin{cases}
0,&\delta(p_u)=1,\\
1,&r_v(u)=0,\\
\exp\!\left[-\dfrac{r_v(u)^2|G_s(u)|^{\epsilon_u}}{n}\right],&\text{otherwise}.
\end{cases}
$$

For disconnected input, the implementation applies the same procedure to a DFS forest and reports that this is an implementation extension because the paper does not prescribe the edge case.

## Imperviousness

The implementation operationalizes compromise as completely isolating a subject-supporting vertex from $G_t$. In a simple undirected graph this requires deleting every incident edge, giving

$$
r_e(u)=\min_{v\in V_u}\deg_{G_t}(v).
$$

Imperviousness is then

$$
I_L(u)=
\begin{cases}
0,&m=0\ \text{or}\ \delta(p_u)=1\ \text{or}\ r_e(u)=0,\\
1,&r_e(u)=n-1\ \text{and}\ \lambda(p_u)>1,\\
\exp\!\left[
1-\left(\dfrac{\lambda(p_u)}{n}\right)^{-\epsilon_u^2/r_e(u)}
\right],&\text{otherwise}.
\end{cases}
$$

Both coordinates are clamped to $[0,1]$ to absorb floating-point error.

## Vectors, aggregation, and ontology classes

Each subject produces

$$
\vec d_u=
\begin{bmatrix}T_L(u)\\I_L(u)\end{bmatrix},
\qquad
\|\vec d_u\|_2=\sqrt{T_L(u)^2+I_L(u)^2}.
$$

For a declared set $\mathbf U=\{u_1,\ldots,u_k\}$, the aggregate is the equal element-wise mean

$$
A(\mathbf U)=\frac{1}{k}\sum_{i=1}^{k}\vec d_{u_i},
\qquad
\|A(\mathbf U)\|_2=\sqrt{A_T^2+A_I^2}.
$$

Aggregate comparisons should use identical declared subject sets. The comparison workspace supports all systems, systems with the same subject set, or one named subject shared across systems.

The implemented ontology classifications are:

| Level | Classification | Condition |
|---|---|---|
| Subject | Centralized | $\delta(p_u)=1$ |
| Subject | Decentralized | $\delta(p_u)>1$ |
| Subject | Undistributed | $\lambda(p_u)=1$ |
| Subject | Distributed | $\lambda(p_u)>1$ |
| System | Fully decentralized | Every declared subject is decentralized |
| System | Partially decentralized | Centralized and decentralized subjects both occur |
| System | Centralized | No declared subject is decentralized |
| System | Distributed | The union of all subject supports spans more than one vertex |

## Graph input and snapshots

Supported topology imports are:

- JSON containing `nodes` and `edges`, optionally with `subjects`;
- JSON adjacency matrices;
- CSV, TSV, or whitespace-separated edge lists;
- GraphML/XML.

The application exports complete canvas snapshots and evaluation results as JSON. Imported graphs are normalized to the same simple undirected representation used by the evaluator.

## Simulation

Simulations use a deterministic seeded pseudorandom generator. Each system independently samples its order, topology, parameters, perturbations, and subject projections.

Available graph families are path, star, ring, wheel, square mesh, balanced tree, $G(n,m)$, random regular, preferential attachment, small-world, random geometric, community, bipartite, core--periphery, lollipop, and complete graphs. A weighted mixed-family generator is also available.

The simulator supports:

- fixed, uniform, triangular, truncated-normal, and log-uniform graph orders;
- parameter sweeps and parameter jitter;
- edge deletion and addition noise;
- optional connectivity repair;
- uniform, degree-based, clustered, articulation-based, and peripheral subject placement;
- independent, overlapping, separated, or nested subject supports;
- fixed, uniform, Poisson, and geometric realization multiplicities;
- a completely random preset and eight application-pattern presets.

For sampled coverage $q_u$, subject support is constructed as

$$
\lambda_i(p_u)=
\operatorname{clip}\!\left(\operatorname{round}(n_iq_u),1,n_i\right),
\qquad
\delta_i(p_u)=\sum_{v\in V_{u,i}}c_{u,i}(v).
$$

Current browser-side limits are 250,000 vertices per system and 100,000 systems per batch, with additional budgets of 25,000,000 vertex instances, 100,000,000 edge instances, and 12,500,000 edges in one system. Evaluation uses the complete generated graph; only large visual previews are simplified.

## Source layout and tests

```text
src/index.html   Document structure
src/styles.css   Responsive styling and visualizations
src/app.js       Graph editing, validation, metrics, simulation, and comparison
build.mjs        Standalone HTML builder
tests/           Core and browser-DOM regression tests
dist/            Generated standalone application
```

Run the implementation tests with:

```bash
node tests/core.test.mjs
node tests/dom.test.mjs
```

The core suite checks the four paper examples, the separation of decentralization from distribution, all 16 topology generators, validation rules, and exact evaluation of a 100,000-vertex sparse graph.

## Limitations

- This is a browser-side research prototype, not a hardened graph-processing service.
- Dense graphs and very large batches may exhaust browser memory despite the configured workload limits.
- Long computations run locally and remain dependent on browser and device performance.
- Disconnected-topology handling is explicitly an implementation extension.
- $r_e$ is implemented as minimum supporting-vertex degree, corresponding to full vertex isolation; alternative notions of functional compromise would require a different cut computation.
- Numerical output does not replace checking whether the selected subjects, realization counts, and $\epsilon$ values correctly represent the system being studied.

## References and design credit

- *Defining Decentralization: An Ontological Perspective*, anonymized manuscript, especially the modeling and analytical layers and Propositions 1--2.
- [Depth-First Search and Linear Graph Algorithms](https://epubs.siam.org/doi/10.1137/0201010), the low-link basis for articulation-point computation.
- Interface design adapted from [Arcana by HTML5 UP](https://html5up.net/arcana), used under the [Creative Commons Attribution 3.0 license](https://html5up.net/license).
