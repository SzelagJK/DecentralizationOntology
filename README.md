> **Prototype disclaimer**
>
> The following implementation is a research prototype supplied as a supporting artifact for the paper titled **“Defining Decentralization: An Ontological Perspective.”** It is not production-ready software. Results should be checked against the definitions and propositions in the paper.

# Decentralization Ontology Sandbox

A standalone browser tool for constructing, importing, simulating, evaluating, and comparing graph representations of computer communication systems. It implements the paper's anchor-relative ontology together with the Void Tolerance and Imperviousness metrics.

## Run the application

Implementation accessible on: https://szelagjk.github.io/DecentralizationOntology/

## Model

A system topology is represented as a finite simple undirected graph

$$
G_t=(V,E), \qquad n=|V|, \qquad m=|E|.
$$

The graph canvas stores a unique identifier and square-plane coordinates for each vertex, plus unordered endpoint pairs for edges. Coordinates control only the drawing; all evaluation uses the adjacency structure of $G_t$.

For a system $s$, an evaluation profile $E_s\subseteq U_s\times A_s$ declares the subject--anchor pairs to evaluate. For each subject $u$, the model stores a positive realization count $c_u(v)$ at every supporting vertex and derives

$$
V_u=\{v\in V:c_u(v)>0\}, \qquad
\lambda(p_u)=|V_u|, \qquad
\delta(p_u)=\sum_{v\in V_u}c_u(v).
$$

For each anchor $a$, one system-level center family $C_a\subseteq\mathcal P(V)$ is supplied as named vertex regions. The canvas editor declares the contextual interpretation once, then assigns region membership by clicking vertices; all profile entries using $a$ reuse that same family. Regions may overlap. Vertices not covered by a declared region are completed as singleton centers before evaluation. The anchor-relative center count is

$$
\mu(p_u,a)=\left|\{V_c\in C_a:V_c\cap V_u\neq\varnothing\}\right|.
$$

- $\delta(p_u)$ is the number of subject realizations.
- $\lambda(p_u)$ is the number of distinct supporting vertices.
- $\mu(p_u,a)$ is the number of center regions reached under anchor $a$.
- Multiple realizations may occupy one vertex, so $1\leq\lambda(p_u)\leq\delta(p_u)$; distribution does not by itself imply decentralization.
- $\epsilon_{u,a}>0$ is the subject--anchor weight factor used by both metrics.

The interface offers ownership, authority, trust, and governance as realistic naming templates, together with a custom option. These are editing conveniences based on examples and inputs discussed in the paper, not a fixed taxonomy of anchors: the modeler remains responsible for disclosing the contextual interpretation of every $a\in A_s$.

Before evaluation, the implementation rejects missing or duplicate identifiers, invalid edge endpoints, self-loops, duplicate edges, empty supports, invalid realization counts, $\sum_vc_u(v)\neq\delta(p_u)$, $\lambda(p_u)>\delta(p_u)$, non-positive $\epsilon_{u,a}$, missing anchor selections, duplicate subject--anchor pairs, and center regions that reference absent vertices.

## Void Tolerance

The implementation performs one iterative Tarjan low-link traversal over the **full topology** $G_t$. This produces a depth-first-search forest, connected-component identifiers, subtree sizes, low-link values, and all articulation vertices in $O(n+m)$ time.

An articulation vertex is a vertex whose removal increases the number of connected components. Tarjan's test for a non-root DFS vertex $v$ and child $w$ is

$$
\mathrm{low}(w)\geq\mathrm{disc}(v).
$$

A DFS root is an articulation vertex when it has more than one DFS child. Vertex and neighbour order may change the DFS tree, but not the resulting articulation set.

Profile entries are applied after the structural traversal. Only articulation vertices supporting $u$ are eligible:

$$
A_u=A(G_t)\cap V_u,
\qquad
r_v(u,a)=|A_u|.
$$

The component isolated by removing $v\in A_u$ is not required to contain another subject-supporting vertex. The removed vertex must belong to $V_u$, while the structural separation is evaluated over the full topology.

For each $v\in A_u$, let $\mathcal C_v$ contain the components of $G_t-v$. The reference component is selected lexicographically:

$$
C_v^\star\in
\underset{C\in\mathcal C_v}{\mathrm{arg\,max}}
\left(|C\cap(V_u\setminus\{v\})|,|C|\right)
\quad\text{(lexicographically)}.
$$

This first maximizes the number of remaining supporting vertices and uses total component order only to break a tie. All other components form the isolated portion:

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
T_L(u,a)=
\begin{cases}
0,&\mu(p_u,a)=1,\\
1,&r_v(u,a)=0,\\
\exp\left[-\dfrac{r_v(u,a)^2|G_s(u)|^{\epsilon_{u,a}}}{n}\right],&\text{otherwise}.
\end{cases}
$$

For disconnected input, the implementation applies the same procedure to a DFS forest and reports that this is an implementation extension because the paper does not prescribe the edge case.

## Imperviousness

The implementation operationalizes compromise as completely isolating a subject-supporting vertex from $G_t$. In a simple undirected graph this requires deleting every incident edge, giving

$$
r_e(u,a)=\min_{v\in V_u}\deg_{G_t}(v).
$$

Imperviousness is then

$$
I_L(u,a)=
\begin{cases}
0,&m=0\ \text{or}\ \mu(p_u,a)=1\ \text{or}\ r_e(u,a)=0,\\
1,&r_e(u,a)=n-1\ \text{and}\ \lambda(p_u)>1,\\
\exp\left[
1-\left(\dfrac{\lambda(p_u)}{n}\right)^{-\epsilon_{u,a}^2/r_e(u,a)}
\right],&\text{otherwise}.
\end{cases}
$$

Both coordinates are clamped to $[0,1]$ to absorb floating-point error.

## Vectors, aggregation, and ontology classes

Each declared pair produces

$$
\vec d_{u,a}=
\begin{bmatrix}T_L(u,a)\\ I_L(u,a)\end{bmatrix},
\qquad
\|\vec d_{u,a}\|_2=\sqrt{T_L(u,a)^2+I_L(u,a)^2}.
$$

For a non-empty profile $E_s$, the aggregate is the equal element-wise mean

$$
A(E_s)=\frac{1}{|E_s|}\sum_{(u,a)\in E_s}\vec d_{u,a},
\qquad
\|A(E_s)\|_2=\sqrt{A_T^2+A_I^2}.
$$

Aggregate comparisons should use identical declared subject--anchor profiles and center interpretations. The comparison workspace supports all systems, systems with the same profile, or one named profile entry shared across systems.

The implemented ontology classifications are:

| Level | Classification | Condition |
|---|---|---|
| Pair | Centralized | $\mu(p_u,a)=1$ |
| Pair | Decentralized | $\mu(p_u,a)>1$ |
| Subject projection | Undistributed | $\lambda(p_u)=1$ |
| Subject projection | Distributed | $\lambda(p_u)>1$ |
| System | Fully decentralized | Every pair in $E_s$ is decentralized |
| System | Partially decentralized | Centralized and decentralized pairs both occur |
| System | Centralized | No pair in $E_s$ is decentralized |
| System | Dimensionality | $|\{(u,a)\in E_s:\mu(p_u,a)>1\}|$ |

The interface separately reports each pair's $\lambda$-based distribution status and a descriptive union-support summary for visualization; the latter is not an additional ontology class.

## Graph input and snapshots

Supported topology imports are:

- JSON containing `nodes` and `edges`, optionally with system-level `anchors` (each containing `regions`) and profile entries in `subjects` using `anchorId` and `realizations`;
- JSON adjacency matrices;
- CSV, TSV, or whitespace-separated edge lists;
- GraphML/XML.

The application exports complete canvas snapshots and evaluation results as JSON. Result exports also include CSV. Imported graphs are normalized to the same simple undirected representation used by the evaluator. Older JSON snapshots with per-subject `anchor` and `centers` fields remain importable: their labels are migrated into a shared system-level family, and missing center coverage receives the paper's singleton completion.

## Simulation

Simulations use a deterministic seeded pseudorandom generator. Each system independently samples its order, topology, parameters, perturbations, subject projections, contextual anchor assignments, and center families. A subject can use a fixed anchor, infer a suggested interpretation from its name, or draw from enabled anchors by relative weight. Every subject resolving to the same anchor within a system shares the same generated $C_a$.

Available graph families are path, star, ring, wheel, square mesh, balanced tree, $G(n,m)$, random regular, preferential attachment, small-world, random geometric, community, bipartite, core--periphery, lollipop, and complete graphs. A weighted mixed-family generator is also available.

The simulator supports:

- fixed, uniform, triangular, truncated-normal, and log-uniform graph orders;
- parameter sweeps and parameter jitter;
- edge deletion and addition noise;
- optional connectivity repair;
- uniform, degree-based, clustered, articulation-based, and peripheral subject placement;
- independent, overlapping, separated, or nested subject supports;
- independent singleton actors, one-operator families, few-actor organizations, hub-led control domains, connected operating domains, overlapping consortia, and anchor-specific mixtures;
- fixed, uniform, Poisson, and geometric realization multiplicities;
- a completely random preset and eight application-pattern presets.

For generated ownership, authority, trust, and governance interpretations, configurable actor-count ranges, dominant-actor shares, and cross-domain overlap probabilities produce named owners, operators, trust roots, or governing bodies. The dedicated randomization control changes anchor availability, assignment strategies, and center-family models as well as their parameters. These distributions are disclosed simulation heuristics rather than empirical laws or additions to the ontology; meaningful cross-system comparison still requires compatible evaluation profiles and center interpretations.

For sampled coverage $q_{u,a}$, support and realization multiplicity are constructed as

$$
\lambda_i(p_u)=
\mathrm{clip}\left(\mathrm{round}(n_iq_{u,a}),1,n_i\right),
\qquad
\delta_i(p_u)=\sum_{v\in V_{u,i}}c_{u,i}(v).
$$

Current browser-side limits are 250,000 vertices per system and 100,000 systems per batch, with additional budgets of 25,000,000 vertex instances, 100,000,000 edge instances, and 12,500,000 edges in one system. Evaluation uses the complete generated graph; only large visual previews are simplified.

## References

- J. K. Szelag, A. Abadi, and M. Naseri, *Defining Decentralization: An Ontological Perspective*, especially Sections VIII--XI, Definition 5, Propositions 1 and 2, and Figures 4--6.
- [Depth-First Search and Linear Graph Algorithms](https://epubs.siam.org/doi/10.1137/0201010)
- Interface design adapted from [Arcana by HTML5 UP](https://html5up.net/arcana), used under the [Creative Commons Attribution 3.0 license](https://html5up.net/license).
